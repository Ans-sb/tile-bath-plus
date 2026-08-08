require "sketchup.rb"
require "json"
require "net/http"
require "uri"
require "fileutils"
require "tmpdir"

module Jajaego
  module SketchupConnector
    extend self

    PLUGIN_ID = "jajaego_sketchup".freeze
    DEFAULT_API_BASE = "http://localhost:4173".freeze

    def show_dialog
      @dialog ||= build_dialog
      @dialog.show
      @dialog.bring_to_front
    end

    def build_dialog
      dialog = UI::HtmlDialog.new(
        dialog_title: "자재GO SketchUp 연동",
        preferences_key: "#{PLUGIN_ID}.dialog",
        scrollable: true,
        resizable: true,
        width: 440,
        height: 760,
        min_width: 360,
        min_height: 560,
        style: UI::HtmlDialog::STYLE_DIALOG
      )
      dialog.set_file(File.join(__dir__, "dialog.html"))
      dialog.add_action_callback("load_package") do |_context, raw_payload|
        handle_load_package(dialog, raw_payload)
      end
      dialog.add_action_callback("apply_material") do |_context, raw_payload|
        handle_apply_material(dialog, raw_payload)
      end
      dialog.add_action_callback("open_help") do |_context|
        UI.messagebox("자재GO 웹에서 장바구니 타일을 선택하고 연동 코드를 만든 뒤 이 창에 입력하세요.")
      end
      dialog
    end

    def handle_load_package(dialog, raw_payload)
      payload = parse_payload(raw_payload)
      api_base = normalize_api_base(payload["apiBase"])
      code = payload["code"].to_s.upcase.gsub(/[^A-Z0-9]/, "")
      raise "연동 코드를 입력해주세요." if code.empty?

      response = http_json(:get, "#{api_base}/api/local/sketchup/packages/#{URI.encode_www_form_component(code)}")
      package = response.fetch("package")
      @active_api_base = api_base
      @active_package = package
      execute_dialog(dialog, "receivePackage", package)
    rescue StandardError => error
      execute_dialog(dialog, "receiveError", { message: error.message })
    end

    def handle_apply_material(dialog, raw_payload)
      payload = parse_payload(raw_payload)
      package = @active_package
      raise "먼저 연동 코드를 불러오세요." unless package

      item = package.fetch("items").find { |entry| entry["productId"].to_s == payload["productId"].to_s }
      raise "연동 패키지에서 상품을 찾지 못했습니다." unless item

      model = Sketchup.active_model
      faces = model.selection.grep(Sketchup::Face)
      raise "SketchUp에서 타일을 적용할 면을 먼저 선택해주세요." if faces.empty?

      rotation = payload["rotation"].to_f
      offset_x_mm = numeric_value(payload["offsetXmm"], package.dig("layout", "offsetXmm"))
      offset_y_mm = numeric_value(payload["offsetYmm"], package.dig("layout", "offsetYmm"))
      material = material_for_item(model, item)
      model.start_operation("자재GO 타일 적용", true)
      faces.each do |face|
        frame = apply_material_to_face(face, material, item, rotation, offset_x_mm, offset_y_mm)
        apply_grout_grid(face, frame, item, package)
        face.set_attribute(PLUGIN_ID, "product_id", item["productId"].to_s)
        face.set_attribute(PLUGIN_ID, "role", item["role"].to_s)
        face.set_attribute(PLUGIN_ID, "offset_x_mm", offset_x_mm)
        face.set_attribute(PLUGIN_ID, "offset_y_mm", offset_y_mm)
        face.set_attribute(PLUGIN_ID, "grout_mm", package.dig("grout", "widthMm") || package["groutMm"] || 0)
        face.set_attribute(PLUGIN_ID, "grout_color", package.dig("grout", "color").to_s)
      end
      model.commit_operation

      area_sqm = faces.inject(0.0) { |sum, face| sum + face.area } * 0.00064516
      report_payload = {
        productId: item["productId"],
        role: item["role"],
        surfaceId: "#{model.guid}:#{faces.map(&:entityID).join('-')}",
        areaSqm: area_sqm,
        rotation: rotation,
        offsetXmm: offset_x_mm,
        offsetYmm: offset_y_mm
      }
      result = http_json(
        :post,
        "#{@active_api_base}/api/local/sketchup/packages/#{package.fetch('code')}/report",
        report_payload
      )
      @active_package = result.fetch("package")
      execute_dialog(dialog, "receiveApplied", {
        item: item,
        faceCount: faces.length,
        report: result.fetch("report"),
        package: @active_package
      })
    rescue StandardError => error
      begin
        model.abort_operation if defined?(model) && model
      rescue StandardError
        nil
      end
      execute_dialog(dialog, "receiveError", { message: error.message })
    end

    def material_for_item(model, item)
      material_name = "JAJAEGO_#{safe_file_name(item['productId'])}"
      material = model.materials[material_name] || model.materials.add(material_name)
      image_url = item["imageUrl"].to_s
      raise "상품 이미지가 없어 SketchUp 재질을 만들 수 없습니다." if image_url.empty?

      texture_path = download_texture(image_url, item["productId"])
      material.texture = texture_path
      width = [item["widthMm"].to_f, 1.0].max.mm
      height = [item["heightMm"].to_f, 1.0].max.mm
      material.texture.size = [width, height] if material.texture
      material.set_attribute(PLUGIN_ID, "product_id", item["productId"].to_s)
      material.set_attribute(PLUGIN_ID, "size_label", item["sizeLabel"].to_s)
      material
    end

    def apply_material_to_face(face, material, item, rotation_degrees, offset_x_mm = 0, offset_y_mm = 0)
      face.material = material
      base_origin = face.vertices.first.position
      normal = face.normal.normalize
      x_axis = projected_axis(normal, Geom::Vector3d.new(1, 0, 0))
      x_axis = projected_axis(normal, Geom::Vector3d.new(0, 1, 0)) unless x_axis.valid?
      x_axis.normalize!
      y_axis = normal * x_axis
      y_axis.normalize!
      transform = Geom::Transformation.rotation(base_origin, normal, rotation_degrees.degrees)
      x_axis.transform!(transform)
      y_axis.transform!(transform)
      origin = base_origin.offset(x_axis, -offset_x_mm.to_f.mm).offset(y_axis, -offset_y_mm.to_f.mm)

      width = [item["widthMm"].to_f, 1.0].max.mm
      height = [item["heightMm"].to_f, 1.0].max.mm
      model_points = [
        origin,
        origin.offset(x_axis, width),
        origin.offset(x_axis, width).offset(y_axis, height),
        origin.offset(y_axis, height)
      ]
      uv_points = [
        Geom::Point3d.new(0, 0, 0),
        Geom::Point3d.new(1, 0, 0),
        Geom::Point3d.new(1, 1, 0),
        Geom::Point3d.new(0, 1, 0)
      ]
      mapping = model_points.zip(uv_points).flatten
      face.position_material(material, mapping, true)
      { origin: origin, normal: normal, x_axis: x_axis, y_axis: y_axis }
    end

    def apply_grout_grid(face, frame, item, package)
      entities = face.parent.entities
      surface_key = face.entityID.to_s
      existing = entities.grep(Sketchup::Group).select do |group|
        group.get_attribute(PLUGIN_ID, "grout_surface_id").to_s == surface_key
      end
      entities.erase_entities(existing) unless existing.empty?

      grout_mm = numeric_value(package.dig("grout", "widthMm"), package["groutMm"])
      return if grout_mm <= 0

      width = [item["widthMm"].to_f + grout_mm, 1.0].max.mm
      height = [item["heightMm"].to_f + grout_mm, 1.0].max.mm
      polygon = face.outer_loop.vertices.map do |vertex|
        vector = vertex.position - frame[:origin]
        [vector.dot(frame[:x_axis]), vector.dot(frame[:y_axis])]
      end
      return if polygon.length < 3

      min_x, max_x = polygon.map(&:first).minmax
      min_y, max_y = polygon.map(&:last).minmax
      group = entities.add_group
      group.name = "자재GO 줄눈 #{item['name']}"
      group.set_attribute(PLUGIN_ID, "grout_surface_id", surface_key)
      group.set_attribute(PLUGIN_ID, "product_id", item["productId"].to_s)
      grout_material = grout_material_for(Sketchup.active_model, package.dig("grout", "color"))
      line_count = 0
      epsilon = 0.2.mm

      each_grid_position(min_x, max_x, width) do |x|
        line_intersections(polygon, x, :vertical).each_slice(2) do |pair|
          next unless pair.length == 2
          points = pair.map { |y| frame[:origin].offset(frame[:x_axis], x).offset(frame[:y_axis], y).offset(frame[:normal], epsilon) }
          edge = group.entities.add_line(points[0], points[1])
          edge.material = grout_material if edge.respond_to?(:material=)
          line_count += 1
          break if line_count >= 400
        end
        break if line_count >= 400
      end

      if line_count < 400
        each_grid_position(min_y, max_y, height) do |y|
          line_intersections(polygon, y, :horizontal).each_slice(2) do |pair|
            next unless pair.length == 2
            points = pair.map { |x| frame[:origin].offset(frame[:x_axis], x).offset(frame[:y_axis], y).offset(frame[:normal], epsilon) }
            edge = group.entities.add_line(points[0], points[1])
            edge.material = grout_material if edge.respond_to?(:material=)
            line_count += 1
            break if line_count >= 400
          end
          break if line_count >= 400
        end
      end
      entities.erase_entities(group) if line_count.zero?
    end

    def each_grid_position(minimum, maximum, step)
      return if step <= 0
      position = (minimum / step).floor * step
      count = 0
      while position <= maximum && count < 500
        yield position
        position += step
        count += 1
      end
    end

    def line_intersections(polygon, fixed, direction)
      intersections = []
      polygon.each_with_index do |point, index|
        next_point = polygon[(index + 1) % polygon.length]
        a1 = direction == :vertical ? point[0] : point[1]
        a2 = direction == :vertical ? next_point[0] : next_point[1]
        next unless (a1 <= fixed && a2 > fixed) || (a2 <= fixed && a1 > fixed)
        ratio = (fixed - a1) / (a2 - a1)
        b1 = direction == :vertical ? point[1] : point[0]
        b2 = direction == :vertical ? next_point[1] : next_point[0]
        intersections << b1 + ((b2 - b1) * ratio)
      end
      intersections.sort
    end

    def grout_material_for(model, color_value)
      color = normalize_hex_color(color_value)
      name = "JAJAEGO_GROUT_#{color.delete('#')}"
      material = model.materials[name] || model.materials.add(name)
      material.color = Sketchup::Color.new(color[1, 2].to_i(16), color[3, 2].to_i(16), color[5, 2].to_i(16))
      material
    end

    def projected_axis(normal, axis)
      projection = axis - (normal * axis.dot(normal))
      projection
    rescue StandardError
      axis
    end

    def download_texture(url, product_id)
      uri = URI.parse(url)
      raise "지원하지 않는 이미지 주소입니다." unless %w[http https].include?(uri.scheme)
      response = request_with_redirect(uri)
      raise "상품 이미지를 내려받지 못했습니다. (#{response.code})" unless response.is_a?(Net::HTTPSuccess)

      extension = extension_for(response["content-type"], uri.path)
      directory = File.join(Dir.tmpdir, PLUGIN_ID)
      FileUtils.mkdir_p(directory)
      file_path = File.join(directory, "#{safe_file_name(product_id)}#{extension}")
      File.binwrite(file_path, response.body)
      file_path
    end

    def request_with_redirect(uri, limit = 4)
      raise "이미지 주소의 리디렉션이 너무 많습니다." if limit <= 0
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 8, read_timeout: 20) do |http|
        http.request(Net::HTTP::Get.new(uri.request_uri))
      end
      return request_with_redirect(URI.join(uri, response["location"]), limit - 1) if response.is_a?(Net::HTTPRedirection)
      response
    end

    def http_json(method, url, payload = nil)
      uri = URI.parse(url)
      request = method == :post ? Net::HTTP::Post.new(uri.request_uri) : Net::HTTP::Get.new(uri.request_uri)
      request["Accept"] = "application/json"
      if payload
        request["Content-Type"] = "application/json"
        request.body = JSON.generate(payload)
      end
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 5, read_timeout: 15) do |http|
        http.request(request)
      end
      body = response.body.to_s.empty? ? {} : JSON.parse(response.body)
      raise(body["error"] || "자재GO 로컬 서버 요청에 실패했습니다. (#{response.code})") unless response.is_a?(Net::HTTPSuccess)
      body
    rescue Errno::ECONNREFUSED, SocketError
      raise "자재GO 로컬 서버가 꺼져 있습니다. http://localhost:4173을 먼저 실행해주세요."
    end

    def execute_dialog(dialog, function_name, payload)
      dialog.execute_script("window.Jajaego.#{function_name}(#{JSON.generate(payload)})")
    end

    def parse_payload(raw_payload)
      raw_payload.is_a?(String) ? JSON.parse(raw_payload) : raw_payload
    rescue JSON::ParserError
      raise "요청 데이터 형식이 올바르지 않습니다."
    end

    def normalize_api_base(value)
      source = value.to_s.strip
      source = DEFAULT_API_BASE if source.empty?
      uri = URI.parse(source)
      raise "로컬 서버 주소는 http 또는 https만 사용할 수 있습니다." unless %w[http https].include?(uri.scheme)
      source.sub(%r{/+$}, "")
    end

    def safe_file_name(value)
      value.to_s.gsub(/[^A-Za-z0-9_-]/, "_")[0, 100]
    end

    def numeric_value(value, fallback = 0)
      source = value.nil? || value.to_s.empty? ? fallback : value
      Float(source || 0)
    rescue ArgumentError, TypeError
      0.0
    end

    def normalize_hex_color(value)
      source = value.to_s.strip.upcase
      source.match?(/^#[0-9A-F]{6}$/) ? source : "#D8D5CF"
    end

    def extension_for(content_type, source_path)
      return ".png" if content_type.to_s.include?("png")
      return ".jpg" if content_type.to_s.match?(/jpe?g/)
      source_extension = File.extname(source_path.to_s).downcase
      %w[.png .jpg .jpeg].include?(source_extension) ? source_extension : ".jpg"
    end

    unless file_loaded?(__FILE__)
      command = UI::Command.new("자재GO 연동") { show_dialog }
      command.tooltip = "자재GO 타일 재질 불러오기"
      command.status_bar_text = "자재GO 장바구니 타일을 SketchUp 면에 적용합니다."
      UI.menu("Extensions").add_item(command)
      toolbar = UI::Toolbar.new("자재GO")
      toolbar.add_item(command)
      toolbar.restore
      file_loaded(__FILE__)
    end
  end
end
