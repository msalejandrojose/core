import Foundation
import Capacitor
#if canImport(ActivityKit)
import ActivityKit
#endif

/// Puente entre el entreno en vivo de la web y la Live Activity de iOS.
///
/// - `start` / `update` / `end`: la web manda el estado completo (JSON con la
///   forma de `BrioWorkoutAttributes.ContentState`).
/// - `takeChanges`: devuelve el estado si se tocó desde la Live Activity desde
///   la última vez (y lo olvida). Se emite `change` cuando pasa con la app viva.
@objc(BrioLiveActivityPlugin)
public class BrioLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BrioLiveActivityPlugin"
    public let jsName = "BrioLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "takeChanges", returnType: CAPPluginReturnPromise),
    ]

    private var observer: NSObjectProtocol?

    override public func load() {
        observer = NotificationCenter.default.addObserver(
            forName: Notification.Name("BrioLiveActivityChanged"), object: nil, queue: .main
        ) { [weak self] _ in
            self?.notifyListeners("change", data: [:])
        }
    }

    deinit {
        if let observer { NotificationCenter.default.removeObserver(observer) }
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        if #available(iOS 17.0, *) {
            call.resolve(["available": ActivityAuthorizationInfo().areActivitiesEnabled])
            return
        }
        #endif
        call.resolve(["available": false])
    }

    // Las dos crean la actividad si no existe (p. ej. si la app se reabrió con un entreno a medias).
    @objc func start(_ call: CAPPluginCall) { upsert(call) }
    @objc func update(_ call: CAPPluginCall) { upsert(call) }

    private func upsert(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        guard #available(iOS 17.0, *) else { return call.resolve(["active": false]) }
        guard let raw = call.getObject("state"),
              let data = try? JSONSerialization.data(withJSONObject: raw),
              var state = try? JSONDecoder().decode(BrioWorkoutAttributes.ContentState.self, from: data)
        else { return call.reject("Estado de la Live Activity no válido") }

        Task {
            let stale = Date().addingTimeInterval(60 * 60 * 4)
            if let activity = Activity<BrioWorkoutAttributes>.activities.first {
                // Conserva el contador para que un cambio pendiente no se pise.
                state.rev = max(state.rev, activity.content.state.rev)
                await activity.update(ActivityContent(state: state, staleDate: stale))
                call.resolve(["active": true])
                return
            }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                return call.resolve(["active": false])
            }
            do {
                _ = try Activity.request(
                    attributes: BrioWorkoutAttributes(routineName: state.title),
                    content: ActivityContent(state: state, staleDate: stale),
                    pushType: nil
                )
                call.resolve(["active": true])
            } catch {
                call.reject("No se pudo iniciar la Live Activity: \(error.localizedDescription)")
            }
        }
        #else
        call.resolve(["active": false])
        #endif
    }

    @objc func end(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        guard #available(iOS 17.0, *) else { return call.resolve() }
        UserDefaults.standard.removeObject(forKey: "brio.live.pending")
        Task {
            for activity in Activity<BrioWorkoutAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
        #else
        call.resolve()
        #endif
    }

    @objc func takeChanges(_ call: CAPPluginCall) {
        let key = "brio.live.pending"
        guard let data = UserDefaults.standard.data(forKey: key),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return call.resolve(["state": NSNull()]) }
        UserDefaults.standard.removeObject(forKey: key)
        call.resolve(["state": obj])
    }
}
