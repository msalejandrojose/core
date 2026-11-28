#!/usr/bin/env ruby
# frozen_string_literal: true

# Ajusta el proyecto de Xcode que genera `cap add ios` según native.config.yml.
# Lo lanza `scripts/native-prepare.mjs` con un JSON ya resuelto (no se usa a mano):
#   - target App: bundle id, versión y build, team, iOS mínimo, entitlements,
#     firma automática y el código nativo propio (`ios.sources`);
#   - extensiones (`ios.extensions`, hoy BrioWidgets): crea el target, le pone
#     sus ficheros, frameworks, Info.plist y entitlements, y la incrusta en la app.
# Es idempotente. Los ficheros se referencian donde viven (native/ios), no se
# copian: lo que se edita es lo que está en git.
#
# Uso: ruby scripts/ios-project.rb <config.json>

require 'json'
require 'xcodeproj'

cfg = JSON.parse(File.read(ARGV.fetch(0) { abort 'Uso: ios-project.rb <config.json>' }))
ios_dir = cfg.fetch('iosDir')
project_path = File.join(ios_dir, 'App.xcodeproj')
abort "No existe #{project_path}" unless File.exist?(project_path)

project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |t| t.name == 'App' } or abort 'No encuentro el target App'

group = project.main_group.find_subpath('BrioNative', true)
group.set_source_tree('SOURCE_ROOT')

def file_ref(group, path)
  group.files.find { |f| f.real_path.to_s == path } || group.new_reference(path)
end

def swift_refs(group, dirs)
  dirs.flat_map { |d| Dir[File.join(d, '*.swift')].sort }.uniq.map { |p| file_ref(group, p) }
end

def add_sources(target, refs)
  refs.each do |ref|
    target.source_build_phase.add_file_reference(ref) unless target.source_build_phase.files_references.include?(ref)
  end
end

common = {
  'MARKETING_VERSION' => cfg.fetch('version'),
  'CURRENT_PROJECT_VERSION' => cfg.fetch('build').to_s,
  'CODE_SIGN_STYLE' => 'Automatic',
}
common['DEVELOPMENT_TEAM'] = cfg['teamId'] if cfg['teamId'] && !cfg['teamId'].empty?

# --- Proyecto y target App --------------------------------------------------
project.build_configurations.each do |c|
  c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = cfg.fetch('deploymentTarget')
end
app.build_configurations.each do |c|
  s = c.build_settings
  s.merge!(common)
  s['PRODUCT_BUNDLE_IDENTIFIER'] = cfg.fetch('bundleId')
  s['IPHONEOS_DEPLOYMENT_TARGET'] = cfg.fetch('deploymentTarget')
  s['CODE_SIGN_ENTITLEMENTS'] = cfg.fetch('entitlements')
end
add_sources(app, swift_refs(group, cfg.fetch('sources')))

# --- Extensiones ------------------------------------------------------------
embed = app.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' }
cfg.fetch('extensions').each do |ext|
  name = ext.fetch('name')
  target = project.targets.find { |t| t.name == name }
  unless target
    target = project.new_target(:app_extension, name, :ios, ext.fetch('deploymentTarget'), nil, :swift)
    target.product_reference.name = "#{name}.appex"
  end

  file_ref(group, ext.fetch('infoPlistFile'))
  target.build_configurations.each do |c|
    s = c.build_settings
    s.merge!(common)
    s['PRODUCT_BUNDLE_IDENTIFIER'] = ext.fetch('bundleId')
    s['PRODUCT_NAME'] = '$(TARGET_NAME)'
    s['INFOPLIST_FILE'] = ext.fetch('infoPlist')
    s['IPHONEOS_DEPLOYMENT_TARGET'] = ext.fetch('deploymentTarget')
    s['SWIFT_VERSION'] = '5.0'
    s['TARGETED_DEVICE_FAMILY'] = '1,2'
    s['SKIP_INSTALL'] = 'YES'
    s['GENERATE_INFOPLIST_FILE'] = 'NO'
    s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
    s['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
    s['CODE_SIGN_ENTITLEMENTS'] = ext.fetch('entitlements')
  end
  add_sources(target, swift_refs(group, ext.fetch('sources')))

  ext.fetch('frameworks').each do |fw|
    path = "System/Library/Frameworks/#{fw}.framework"
    ref = project.frameworks_group.files.find { |f| f.path == path } || project.frameworks_group.new_file(path, :sdk_root)
    target.frameworks_build_phase.add_file_reference(ref, true) unless target.frameworks_build_phase.files_references.include?(ref)
  end

  app.add_dependency(target) unless app.dependencies.any? { |d| d.target == target }
  unless embed
    embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
    embed.symbol_dst_subfolder_spec = :plug_ins
  end
  unless embed.files_references.include?(target.product_reference)
    bf = embed.add_file_reference(target.product_reference, true)
    bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  end
end

project.save
puts "Proyecto iOS ajustado (#{cfg.fetch('bundleId')} #{cfg.fetch('version')} (#{cfg.fetch('build')}), extensiones: #{cfg.fetch('extensions').map { |e| e['name'] }.join(', ')})."
