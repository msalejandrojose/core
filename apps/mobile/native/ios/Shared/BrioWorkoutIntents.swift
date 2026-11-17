import Foundation
#if canImport(ActivityKit)
import ActivityKit
import AppIntents

/// Avisa a la app (al plugin) de que la Live Activity cambió desde un botón.
public extension Notification.Name {
    static let brioLiveActivityChanged = Notification.Name("BrioLiveActivityChanged")
}

/// Aplica un cambio a la Live Activity del entreno. Corre en el proceso de la
/// app (los `LiveActivityIntent` se ejecutan ahí aunque el móvil esté bloqueado),
/// así que actualiza la actividad directamente y deja la marca para que la web
/// recoja el cambio en cuanto pueda.
@available(iOS 17.0, *)
enum BrioLiveActions {
    static let pendingKey = "brio.live.pending"

    static func apply(_ change: (inout BrioWorkoutAttributes.ContentState) -> Void) async {
        guard let activity = Activity<BrioWorkoutAttributes>.activities.first else { return }
        var state = activity.content.state
        change(&state)
        let stale = state.restEnd.map { max($0, Date().addingTimeInterval(60 * 60 * 4)) }
        await activity.update(ActivityContent(state: state, staleDate: stale))
        if let data = try? JSONEncoder().encode(state) {
            UserDefaults.standard.set(data, forKey: pendingKey)
        }
        await MainActor.run {
            NotificationCenter.default.post(name: .brioLiveActivityChanged, object: nil)
        }
    }
}

@available(iOS 17.0, *)
struct BrioCompleteSetIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Serie hecha"
    static var isDiscoverable = false
    init() {}
    func perform() async throws -> some IntentResult {
        await BrioLiveActions.apply { $0.completeSet() }
        return .result()
    }
}

@available(iOS 17.0, *)
struct BrioAdjustWeightIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Cambiar peso"
    static var isDiscoverable = false
    @Parameter(title: "Kilos") var delta: Double
    init() {}
    init(delta: Double) { self.delta = delta }
    func perform() async throws -> some IntentResult {
        await BrioLiveActions.apply { $0.adjustWeight(delta) }
        return .result()
    }
}

@available(iOS 17.0, *)
struct BrioAdjustRepsIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Cambiar repeticiones"
    static var isDiscoverable = false
    @Parameter(title: "Repeticiones") var delta: Int
    init() {}
    init(delta: Int) { self.delta = delta }
    func perform() async throws -> some IntentResult {
        await BrioLiveActions.apply { $0.adjustReps(delta) }
        return .result()
    }
}

@available(iOS 17.0, *)
struct BrioMoveExerciseIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Cambiar de ejercicio"
    static var isDiscoverable = false
    @Parameter(title: "Dirección") var delta: Int
    init() {}
    init(delta: Int) { self.delta = delta }
    func perform() async throws -> some IntentResult {
        await BrioLiveActions.apply { $0.moveExercise(delta) }
        return .result()
    }
}

@available(iOS 17.0, *)
struct BrioSkipRestIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Saltar descanso"
    static var isDiscoverable = false
    init() {}
    func perform() async throws -> some IntentResult {
        await BrioLiveActions.apply { $0.skipRest() }
        return .result()
    }
}
#endif
