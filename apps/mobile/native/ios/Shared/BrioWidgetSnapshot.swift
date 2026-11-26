import Foundation

/// Lo que pintan los widgets de la pantalla de inicio. Lo calcula la web
/// (`src/features/brio/widgets/widget-snapshot.ts`, mismo formato) y lo deja
/// en el App Group con `BrioWidgetsPlugin`; la extensión solo lo lee.
public struct BrioWidgetSnapshot: Codable, Hashable {
    public struct Food: Codable, Hashable {
        public var label: String
        public var remaining: Double?
        public var eaten: Double
        public var ratio: Double
    }

    public struct Move: Codable, Hashable {
        public var label: String
        public var minutes: Double
        public var goal: Double
        public var ratio: Double
    }

    public struct Steps: Codable, Hashable {
        public var label: String
        public var value: Double
        public var ratio: Double
    }

    public struct Macro: Codable, Hashable {
        public var key: String
        public var label: String
        public var grams: Double
        public var target: Double?
        public var ratio: Double
    }

    public struct Workout: Codable, Hashable {
        /// "planned", "done", "rest" o "none".
        public var state: String
        public var kicker: String
        public var title: String?
        public var detail: String?
        /// Familia del deporte (`activity-look.ts`): "team", "run", "strength"…
        public var family: String?
        public var routineId: String?
    }

    public struct WeekDay: Codable, Hashable {
        public var day: String
        public var letter: String
        /// "done", "today", "missed", "planned", "rest" o "free".
        public var state: String
        public var isToday: Bool
        public var family: String?
        public var extra: Int
    }

    public var v: Int
    /// Día al que se refiere (YYYY-MM-DD). Si ya no es hoy, el widget pide abrir la app.
    public var day: String
    public var updatedAt: Double
    public var food: Food
    public var move: Move
    public var steps: Steps?
    public var macros: [Macro]
    public var workout: Workout
    public var week: [WeekDay]
}

public enum BrioWidgetStore {
    /// App Group compartido por la app y la extensión (ver scripts/ios-live-activity.rb).
    public static let appGroup = "group.es.aj.brio"
    static let key = "brio.widgets.snapshot"

    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    public static func save(_ data: Data) {
        defaults?.set(data, forKey: key)
    }

    public static func clear() {
        defaults?.removeObject(forKey: key)
    }

    public static func load() -> BrioWidgetSnapshot? {
        guard let data = defaults?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(BrioWidgetSnapshot.self, from: data)
    }

    /// «2026-11-26» de una fecha, en la zona del teléfono.
    public static func dayString(_ date: Date) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }
}
