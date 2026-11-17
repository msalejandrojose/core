#!/usr/bin/env ruby
# frozen_string_literal: true

# Añade al proyecto iOS (que genera `cap add ios` y no se commitea) la Live
# Activity del entreno en vivo:
#   - target «BrioWidgets» (extensión WidgetKit, iOS 17) con su vista;
#   - los ficheros compartidos (modelo e intents) en la app y en la extensión;
#   - el plugin propio y el controlador que lo registra, en la app;
#   - NSSupportsLiveActivities en el Info.plist y el storyboard apuntando al controlador.
# Es idempotente: se puede pasar las veces que haga falta (p. ej. tras `cap add ios`).
#
# Uso (desde apps/mobile): ruby scripts/ios-live-activity.rb   (o pnpm ios:live-activity)

require 'xcodeproj'
require 'fileutils'

ROOT = File.expand_path('..', __dir__)
NATIVE = File.join(ROOT, 'native/ios')
IOS = File.join(ROOT, 'ios/App')
PROJECT_PATH = File.join(IOS, 'App.xcodeproj')
WIDGET = 'BrioWidgets'
WIDGET_BUNDLE_SUFFIX = '.widgets'

abort "No existe #{PROJECT_PATH}: ejecuta antes `pnpm cap:add:ios`." unless File.exist?(PROJECT_PATH)

project = Xcodeproj::Project.open(PROJECT_PATH)
app = project.targets.find { |t| t.name == 'App' } or abort 'No encuentro el target App'

# Los ficheros se referencian donde viven (native/ios), no se copian: así lo
# que se edita es lo que está en git.
group = project.main_group.find_subpath('BrioNative', true)
group.set_source_tree('SOURCE_ROOT')

def file_ref(group, path)
  group.files.find { |f| f.real_path.to_s == path } || group.new_reference(path)
end

def add_source(target, ref)
  return if target.source_build_phase.files_references.include?(ref)

  target.source_build_phase.add_file_reference(ref)
end

shared = Dir[File.join(NATIVE, 'Shared/*.swift')].sort.map { |p| file_ref(group, p) }
app_only = Dir[File.join(NATIVE, 'App/*.swift')].sort.map { |p| file_ref(group, p) }
widget_only = Dir[File.join(NATIVE, 'Widget/*.swift')].sort.map { |p| file_ref(group, p) }
file_ref(group, File.join(NATIVE, 'Widget/Info.plist'))

(shared + app_only).each { |r| add_source(app, r) }

# --- Extensión --------------------------------------------------------------
widget = project.targets.find { |t| t.name == WIDGET }
unless widget
  widget = project.new_target(:app_extension, WIDGET, :ios, '17.0', nil, :swift)
  widget.product_reference.name = "#{WIDGET}.appex"
end

app_bundle = app.build_configurations.first.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] || 'es.aj.brio'
widget.build_configurations.each do |c|
  app_cfg = app.build_configurations.find { |x| x.name == c.name }&.build_settings || {}
  s = c.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER'] = "#{app_bundle}#{WIDGET_BUNDLE_SUFFIX}"
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['INFOPLIST_FILE'] = File.join(NATIVE, 'Widget/Info.plist')
  s['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
  s['SWIFT_VERSION'] = '5.0'
  s['TARGETED_DEVICE_FAMILY'] = '1,2'
  s['SKIP_INSTALL'] = 'YES'
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['GENERATE_INFOPLIST_FILE'] = 'NO'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
  s['MARKETING_VERSION'] = app_cfg['MARKETING_VERSION'] || '1.0'
  s['CURRENT_PROJECT_VERSION'] = app_cfg['CURRENT_PROJECT_VERSION'] || '1'
  s['DEVELOPMENT_TEAM'] = app_cfg['DEVELOPMENT_TEAM'] if app_cfg['DEVELOPMENT_TEAM']
  s['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
end

(shared + widget_only).each { |r| add_source(widget, r) }
%w[WidgetKit SwiftUI ActivityKit AppIntents].each do |fw|
  ref = project.frameworks_group.files.find { |f| f.path == "System/Library/Frameworks/#{fw}.framework" }
  ref ||= project.frameworks_group.new_file("System/Library/Frameworks/#{fw}.framework", :sdk_root)
  widget.frameworks_build_phase.add_file_reference(ref, true) unless widget.frameworks_build_phase.files_references.include?(ref)
end

app.add_dependency(widget) unless app.dependencies.any? { |d| d.target == widget }
embed = app.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' }
unless embed
  embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
  embed.symbol_dst_subfolder_spec = :plug_ins
end
unless embed.files_references.include?(widget.product_reference)
  bf = embed.add_file_reference(widget.product_reference, true)
  bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
end

project.save

# --- Info.plist y storyboard de la app --------------------------------------
plist = File.join(IOS, 'App/Info.plist')
unless File.read(plist).include?('NSSupportsLiveActivities')
  system('/usr/libexec/PlistBuddy', '-c', 'Add :NSSupportsLiveActivities bool true', plist) or abort 'PlistBuddy falló'
end

storyboard = File.join(IOS, 'App/Base.lproj/Main.storyboard')
sb = File.read(storyboard)
patched = sb.sub('customClass="CAPBridgeViewController" customModule="Capacitor"',
                 'customClass="BrioBridgeViewController" customModule="App" customModuleProvider="target"')
File.write(storyboard, patched) if patched != sb

puts "Live Activity lista en el proyecto iOS (#{WIDGET})."
