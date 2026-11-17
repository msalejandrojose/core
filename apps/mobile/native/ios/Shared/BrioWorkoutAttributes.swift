import Foundation
#if canImport(ActivityKit)
import ActivityKit
#endif

/// Una serie tal como la ve la Live Activity: peso y repeticiones en texto
/// (como en la app, con coma decimal) y si está hecha.
public struct BrioLiveSet: Codable, Hashable {
    public var w: String
    public var r: String
    public var d: Bool
}

/// Un ejercicio del entreno en la Live Activity.
public struct BrioLiveExercise: Codable, Hashable {
    public var name: String
    /// "reps", "m", "time" o "cal": solo las repeticiones se ajustan con ±.
    public var unit: String
    /// Descanso (s) al marcar una serie; 0 si no toca (p. ej. dentro de una superserie).
    public var rest: Int
    public var sets: [BrioLiveSet]
}

#if canImport(ActivityKit)
@available(iOS 16.2, *)
public struct BrioWorkoutAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var title: String
        /// Inicio del entreno (ms desde 1970).
        public var startedAt: Double
        /// Ejercicio enfocado.
        public var focus: Int
        /// Fin del descanso en curso (ms) o nil.
        public var restUntil: Double?
        public var exercises: [BrioLiveExercise]
        /// Sube con cada cambio hecho desde la Live Activity (la app lo usa para saber qué recoger).
        public var rev: Int
    }

    public var routineName: String

    public init(routineName: String) {
        self.routineName = routineName
    }
}

@available(iOS 16.2, *)
public extension BrioWorkoutAttributes.ContentState {
    var current: BrioLiveExercise? {
        exercises.indices.contains(focus) ? exercises[focus] : nil
    }

    /// Serie que toca: la primera sin hacer del ejercicio enfocado (o la última).
    var setIndex: Int {
        guard let ex = current, !ex.sets.isEmpty else { return 0 }
        return ex.sets.firstIndex(where: { !$0.d }) ?? ex.sets.count - 1
    }

    var currentSet: BrioLiveSet? {
        guard let ex = current, ex.sets.indices.contains(setIndex) else { return nil }
        return ex.sets[setIndex]
    }

    var doneCount: Int { exercises.reduce(0) { $0 + $1.sets.filter(\.d).count } }
    var totalCount: Int { exercises.reduce(0) { $0 + $1.sets.count } }
    var exerciseDone: Bool { current.map { $0.sets.allSatisfy(\.d) } ?? true }

    var restEnd: Date? {
        guard let r = restUntil else { return nil }
        let d = Date(timeIntervalSince1970: r / 1000)
        return d > Date() ? d : nil
    }

    var startDate: Date { Date(timeIntervalSince1970: startedAt / 1000) }

    // MARK: Cambios desde los botones

    /// Marca la serie que toca; si el ejercicio queda completo, pasa al siguiente con series pendientes.
    mutating func completeSet(now: Date = Date()) {
        guard exercises.indices.contains(focus) else { return }
        let k = setIndex
        guard exercises[focus].sets.indices.contains(k), !exercises[focus].sets[k].d else { return }
        exercises[focus].sets[k].d = true
        let weight = exercises[focus].sets[k].w
        for y in exercises[focus].sets.indices where y > k && !exercises[focus].sets[y].d
            && exercises[focus].sets[y].w.trimmingCharacters(in: .whitespaces).isEmpty {
            exercises[focus].sets[y].w = weight
        }
        let rest = exercises[focus].rest
        restUntil = rest > 0 ? (now.timeIntervalSince1970 + Double(rest)) * 1000 : nil
        if exerciseDone, let next = nextPending(after: focus) { focus = next }
        rev += 1
    }

    mutating func adjustWeight(_ delta: Double) {
        guard exercises.indices.contains(focus) else { return }
        let k = setIndex
        guard exercises[focus].sets.indices.contains(k) else { return }
        let current = Self.number(exercises[focus].sets[k].w) ?? 0
        let value = max(0, ((current + delta) * 100).rounded() / 100)
        let text = Self.format(value)
        // La serie que toca y las siguientes sin hacer con el mismo peso.
        let old = exercises[focus].sets[k].w
        for y in exercises[focus].sets.indices where y >= k && !exercises[focus].sets[y].d
            && (y == k || exercises[focus].sets[y].w == old) {
            exercises[focus].sets[y].w = text
        }
        rev += 1
    }

    mutating func adjustReps(_ delta: Int) {
        guard exercises.indices.contains(focus), exercises[focus].unit == "reps" else { return }
        let k = setIndex
        guard exercises[focus].sets.indices.contains(k) else { return }
        let current = Int(exercises[focus].sets[k].r) ?? 0
        exercises[focus].sets[k].r = String(max(1, current + delta))
        rev += 1
    }

    mutating func moveExercise(_ delta: Int) {
        guard !exercises.isEmpty else { return }
        focus = min(max(0, focus + delta), exercises.count - 1)
        rev += 1
    }

    mutating func skipRest() {
        restUntil = nil
        rev += 1
    }

    private func nextPending(after i: Int) -> Int? {
        let order = Array(exercises.indices.dropFirst(i + 1)) + Array(exercises.indices.prefix(i))
        return order.first { exercises[$0].sets.contains { !$0.d } }
    }

    static func number(_ s: String) -> Double? {
        Double(s.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespaces))
    }

    static func format(_ v: Double) -> String {
        let t = v == v.rounded() ? String(Int(v)) : String(v)
        return t.replacingOccurrences(of: ".", with: ",")
    }
}
#endif
