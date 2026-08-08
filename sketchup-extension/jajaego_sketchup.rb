require "sketchup.rb"
require "extensions.rb"

module Jajaego
  module SketchupConnector
    unless file_loaded?(__FILE__)
      extension = SketchupExtension.new(
        "자재GO SketchUp 연동",
        "jajaego_sketchup/main"
      )
      extension.description = "자재GO 장바구니 타일을 실제 규격의 SketchUp 재질로 적용합니다."
      extension.version = "0.1.0"
      extension.creator = "JAJAEGO"
      Sketchup.register_extension(extension, true)
      file_loaded(__FILE__)
    end
  end
end
