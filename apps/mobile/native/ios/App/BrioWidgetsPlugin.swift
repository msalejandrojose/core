import Foundation
import Capacitor
import WidgetKit

/// Puente entre la web y los widgets de la pantalla de inicio.
///
/// - `update({ snapshot })`: guarda la instantánea (JSON con la forma de
///   `BrioWidgetSnapshot`) en el App Group y recarga los widgets.
/// - `clear()`: la borra (al cerrar sesión).
@objc(BrioWidgetsPlugin)
public class BrioWidgetsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BrioWidgetsPlugin"
    public let jsName = "BrioWidgets"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]

    @objc func update(_ call: CAPPluginCall) {
        guard let raw = call.getObject("snapshot"),
              let data = try? JSONSerialization.data(withJSONObject: raw),
              (try? JSONDecoder().decode(BrioWidgetSnapshot.self, from: data)) != nil
        else { return call.reject("Datos de los widgets no válidos") }
        BrioWidgetStore.save(data)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        BrioWidgetStore.clear()
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
