import SwiftUI
import WidgetKit

// Widgets de la pantalla de inicio: Hoy (anillos y macros), Entreno de hoy y
// Mi semana. Leen la instantánea que deja la app en el App Group
// (`BrioWidgetSnapshot`); si es de otro día, piden abrir Brío.

// MARK: - Colores del DS de Brío (los del sistema: se adaptan al modo oscuro)

private let brioTint = Color(red: 0, green: 0x64 / 255, blue: 0xD2 / 255)
private let foodColor = Color(uiColor: .systemOrange)
private let moveColor = Color(uiColor: .systemGreen)
private let stepsColor = Color(uiColor: .systemBlue)

private func macroColor(_ key: String) -> Color {
    switch key {
    case "protein": return Color(uiColor: .systemIndigo)
    case "carbs": return Color(red: 0xE0 / 255, green: 0xA8 / 255, blue: 0)
    default: return Color(uiColor: .systemPink)
    }
}

/// Símbolo y color de cada familia de deporte (`activity-look.ts`).
private func sport(_ family: String?) -> (symbol: String, color: Color) {
    switch family {
    case "team": return ("soccerball", moveColor)
    case "racket": return ("tennis.racket", Color(red: 0xB8 / 255, green: 0x84 / 255, blue: 0))
    case "strength": return ("dumbbell.fill", Color(uiColor: .systemPink))
    case "run": return ("figure.run", brioTint)
    case "walk": return ("figure.walk", Color(red: 0x8B / 255, green: 0x5A / 255, blue: 0x2B / 255))
    case "cycle": return ("bicycle", foodColor)
    case "water": return ("figure.pool.swim", stepsColor)
    case "mind": return ("figure.yoga", Color(uiColor: .systemIndigo))
    case "snow": return ("figure.skiing.downhill", stepsColor)
    default: return ("figure.mixed.cardio", Color(uiColor: .systemGray))
    }
}

// MARK: - Datos

struct BrioEntry: TimelineEntry {
    let date: Date
    let snapshot: BrioWidgetSnapshot?

    /// Sin datos o de otro día: hay que abrir la app.
    var usable: BrioWidgetSnapshot? {
        guard let s = snapshot, s.day == BrioWidgetStore.dayString(date) else { return nil }
        return s
    }
}

struct BrioProvider: TimelineProvider {
    func placeholder(in context: Context) -> BrioEntry {
        BrioEntry(date: Date(), snapshot: BrioWidgetSnapshot.sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (BrioEntry) -> Void) {
        let stored = BrioWidgetStore.load() ?? BrioWidgetSnapshot.sample
        completion(BrioEntry(date: Date(), snapshot: context.isPreview ? BrioWidgetSnapshot.sample : stored))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BrioEntry>) -> Void) {
        let now = Date()
        let snapshot = BrioWidgetStore.load()
        var entries = [BrioEntry(date: now, snapshot: snapshot)]
        // A medianoche el día cambia: el widget pasa solo a «abre Brío».
        if let midnight = Calendar.current.nextDate(
            after: now, matching: DateComponents(hour: 0, minute: 0), matchingPolicy: .nextTime
        ) {
            entries.append(BrioEntry(date: midnight, snapshot: snapshot))
        }
        // La app recarga los widgets cada vez que cambian sus datos.
        completion(Timeline(entries: entries, policy: .never))
    }
}

extension BrioWidgetSnapshot {
    static var sample: BrioWidgetSnapshot {
        BrioWidgetSnapshot(
            v: 1,
            day: BrioWidgetStore.dayString(Date()),
            updatedAt: Date().timeIntervalSince1970 * 1000,
            food: .init(label: "1.240 kcal quedan", remaining: 1240, eaten: 1160, ratio: 0.48),
            move: .init(label: "35 de 60 min", minutes: 35, goal: 60, ratio: 0.58),
            steps: .init(label: "8.432 pasos", value: 8432, ratio: 0.84),
            macros: [
                .init(key: "protein", label: "Proteína", grams: 96, target: 140, ratio: 0.69),
                .init(key: "carbs", label: "Hidratos", grams: 180, target: 250, ratio: 0.72),
                .init(key: "fat", label: "Grasa", grams: 48, target: 70, ratio: 0.69),
            ],
            workout: .init(state: "planned", kicker: "Hoy entrenas · 18:30", title: "Torso A",
                           detail: "1 h", family: "strength", routineId: nil),
            week: [
                sampleDay("1", "L", "done", "strength"),
                sampleDay("2", "M", "missed", "run"),
                sampleDay("3", "X", "done", "racket"),
                sampleDay("4", "J", "today", "strength"),
                sampleDay("5", "V", "planned", "run"),
                sampleDay("6", "S", "rest", nil),
                sampleDay("7", "D", "free", nil),
            ]
        )
    }

    private static func sampleDay(_ day: String, _ letter: String, _ state: String, _ family: String?) -> WeekDay {
        WeekDay(day: day, letter: letter, state: state, isToday: state == "today", family: family, extra: 0)
    }
}

// MARK: - Piezas

private struct Ring: View {
    let ratio: Double
    let color: Color
    let width: CGFloat

    var body: some View {
        ZStack {
            Circle().stroke(color.opacity(0.18), lineWidth: width)
            Circle()
                .trim(from: 0, to: min(1, max(0, ratio)))
                .stroke(color, style: StrokeStyle(lineWidth: width, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

/// Anillos concéntricos: comida, entreno y (si hay) pasos.
private struct Rings: View {
    let s: BrioWidgetSnapshot
    let size: CGFloat
    /// Grosor de cada anillo respecto al tamaño.
    var thickness: CGFloat = 0.11

    var body: some View {
        let w = size * thickness
        ZStack {
            Ring(ratio: s.food.ratio, color: foodColor, width: w)
            Ring(ratio: s.move.ratio, color: moveColor, width: w)
                .padding(w * 1.25)
            if let steps = s.steps {
                Ring(ratio: steps.ratio, color: stepsColor, width: w)
                    .padding(w * 2.5)
            }
        }
        .frame(width: size, height: size)
    }
}

/// «1.240»: punto de millar también con cuatro cifras, como en la app.
private func kcalText(_ s: BrioWidgetSnapshot) -> String {
    let digits = String(Int(abs(s.food.remaining ?? s.food.eaten).rounded()))
    var out = ""
    for (i, c) in digits.enumerated() {
        if i > 0 && (digits.count - i) % 3 == 0 { out.append(".") }
        out.append(c)
    }
    return out
}

/// El «reloj»: los anillos con las kcal que quedan en el centro.
private struct TodayDial: View {
    let s: BrioWidgetSnapshot
    let size: CGFloat

    /// Anillos más finos que en el mediano de Hoy para que las kcal quepan
    /// en el hueco del centro (con tres anillos, el hueco es size - 6 grosores).
    private let thickness: CGFloat = 0.075

    var body: some View {
        let hole = size * (1 - 6 * thickness)
        ZStack {
            Rings(s: s, size: size, thickness: thickness)
            VStack(spacing: 0) {
                Text(kcalText(s))
                    .font(.system(size: hole * 0.34, weight: .bold, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                Text(s.food.remaining.map { $0 >= 0 ? "quedan" : "de más" } ?? "kcal")
                    .font(.system(size: max(8, hole * 0.19), weight: .medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(width: hole * 0.88)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Comida: \(s.food.label). Entreno: \(s.move.label)")
    }
}

/// Un día de la semana: el deporte, el check si se hizo y el aro de hoy.
private struct WeekDot: View {
    let d: BrioWidgetSnapshot.WeekDay
    let size: CGFloat

    var body: some View {
        let check = size * 0.4
        ZStack(alignment: .bottomTrailing) {
            switch d.state {
            case "done":
                SportBadge(family: d.family, filled: true, size: size)
                ZStack {
                    Circle().fill(moveColor)
                    Image(systemName: "checkmark")
                        .font(.system(size: check * 0.55, weight: .black))
                        .foregroundStyle(.white)
                }
                .frame(width: check, height: check)
                .overlay(Circle().stroke(Color(uiColor: .systemBackground), lineWidth: 2))
                .offset(x: size * 0.1, y: size * 0.1)
            case "rest":
                Circle().fill(Color(uiColor: .systemIndigo).opacity(0.18)).frame(width: size, height: size)
            case "free":
                Circle().stroke(Color.secondary.opacity(0.25), lineWidth: 2.5).frame(width: size, height: size)
            default:
                if d.family != nil {
                    SportBadge(family: d.family, filled: false, size: size)
                        .opacity(d.state == "missed" ? 0.5 : 1)
                } else {
                    Circle().stroke(Color.secondary.opacity(0.35), lineWidth: 2.5).frame(width: size, height: size)
                }
            }
        }
        .overlay(
            Circle()
                .stroke(d.isToday ? brioTint : .clear, lineWidth: 2)
                .frame(width: size + 6, height: size + 6)
        )
        .overlay(alignment: .topTrailing) {
            if d.extra > 0 {
                Text("+\(d.extra)")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(Color(uiColor: .systemBackground))
                    .padding(.horizontal, 3)
                    .background(Capsule().fill(Color.primary))
                    .offset(x: 6, y: -4)
            }
        }
        .frame(width: size + 6, height: size + 6)
    }
}

private struct OpenAppView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: "sun.max.fill")
                .font(.title3)
                .foregroundStyle(foodColor)
            Spacer(minLength: 0)
            Text("Abre Brío")
                .font(.headline)
            Text("para ver tu día")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private struct SportBadge: View {
    let family: String?
    let filled: Bool
    let size: CGFloat

    var body: some View {
        let look = sport(family)
        ZStack {
            Circle().fill(filled ? look.color : look.color.opacity(0.14))
            Image(systemName: look.symbol)
                .font(.system(size: size * 0.48, weight: .semibold))
                .foregroundStyle(filled ? Color.white : look.color)
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Hoy

struct BrioTodayWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: BrioEntry

    var body: some View {
        Group {
            if let s = entry.usable {
                if family == .systemSmall { small(s) } else { medium(s) }
            } else {
                OpenAppView()
            }
        }
        .widgetURL(URL(string: "brio://hoy"))
        .containerBackground(for: .widget) { Color(uiColor: .systemBackground) }
    }

    private func small(_ s: BrioWidgetSnapshot) -> some View {
        VStack(spacing: 8) {
            TodayDial(s: s, size: 84)
            Text(s.move.label)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(moveColor)
                .lineLimit(1)
        }
    }

    private func medium(_ s: BrioWidgetSnapshot) -> some View {
        HStack(spacing: 14) {
            Rings(s: s, size: 104)
            VStack(alignment: .leading, spacing: 5) {
                legend(foodColor, "Comida", s.food.label)
                legend(moveColor, "Entreno", s.move.label)
                if let steps = s.steps { legend(stepsColor, "Pasos", steps.label) }
                Divider().padding(.vertical, 1)
                ForEach(s.macros, id: \.key) { m in
                    HStack(spacing: 6) {
                        Text(m.key == "protein" ? "Prot." : m.key == "carbs" ? "Hidr." : "Grasa")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                            .frame(width: 30, alignment: .leading)
                        GeometryReader { g in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.secondary.opacity(0.15))
                                Capsule().fill(macroColor(m.key))
                                    .frame(width: g.size.width * min(1, max(0, m.ratio)))
                            }
                        }
                        .frame(height: 5)
                        Text(m.target.map { "\(Int(m.grams))/\(Int($0))" } ?? "\(Int(m.grams)) g")
                            .font(.system(size: 10).monospacedDigit())
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private func legend(_ color: Color, _ title: String, _ value: String) -> some View {
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 7, height: 7)
            Text(value)
                .font(.caption.weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .accessibilityLabel("\(title): \(value)")
    }
}

struct BrioTodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BrioToday", provider: BrioProvider()) { entry in
            BrioTodayWidgetView(entry: entry)
        }
        .configurationDisplayName("Hoy")
        .description("Lo que te queda por comer, tu entreno y tus pasos, con los macros.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Entreno de hoy

struct BrioWorkoutWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: BrioEntry

    var body: some View {
        Group {
            if let s = entry.usable {
                content(s.workout)
            } else {
                OpenAppView()
            }
        }
        .widgetURL(url)
        .containerBackground(for: .widget) { Color(uiColor: .systemBackground) }
    }

    private var url: URL? {
        guard let w = entry.usable?.workout, w.state == "planned" else { return URL(string: "brio://hoy") }
        if let id = w.routineId { return URL(string: "brio://entreno?routine=\(id)") }
        return URL(string: "brio://entreno")
    }

    private func content(_ w: BrioWidgetSnapshot.Workout) -> some View {
        let done = w.state == "done"
        let rest = w.state == "rest"
        return VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top) {
                if done {
                    ZStack {
                        Circle().fill(moveColor)
                        Image(systemName: "checkmark")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)
                    }
                    .frame(width: 32, height: 32)
                } else if rest {
                    ZStack {
                        Circle().fill(Color(uiColor: .systemIndigo).opacity(0.14))
                        Image(systemName: "moon.zzz.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color(uiColor: .systemIndigo))
                    }
                    .frame(width: 32, height: 32)
                } else {
                    SportBadge(family: w.family, filled: false, size: 32)
                }
                Spacer(minLength: 0)
                if family != .systemSmall, let detail = w.detail {
                    Text(detail)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 0)
            Text(w.kicker.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(done ? moveColor : rest ? Color(uiColor: .systemIndigo) : brioTint)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(w.title ?? "Entreno")
                .font(.headline)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
            if w.state == "planned" {
                Text("Empezar ▸")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Capsule().fill(brioTint))
            } else if family == .systemSmall, let detail = w.detail {
                Text(detail)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct BrioWorkoutWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BrioWorkout", provider: BrioProvider()) { entry in
            BrioWorkoutWidgetView(entry: entry)
        }
        .configurationDisplayName("Entreno de hoy")
        .description("Lo que toca hoy según tu plan, para empezarlo de un toque, o lo que ya hiciste.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Mi semana

struct BrioWeekWidgetView: View {
    let entry: BrioEntry

    var body: some View {
        Group {
            if let s = entry.usable {
                week(s)
            } else {
                OpenAppView()
            }
        }
        .widgetURL(URL(string: "brio://plan"))
        .containerBackground(for: .widget) { Color(uiColor: .systemBackground) }
    }

    private func week(_ s: BrioWidgetSnapshot) -> some View {
        let trained = s.week.filter { $0.state == "done" }.count
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Mi semana")
                    .font(.headline)
                Spacer()
                Text(trained == 1 ? "1 día entrenado" : "\(trained) días entrenados")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(moveColor)
            }
            HStack(spacing: 0) {
                ForEach(s.week, id: \.day) { d in
                    VStack(spacing: 6) {
                        Text(d.letter)
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(d.isToday ? brioTint : .secondary)
                        WeekDot(d: d, size: 32)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            Spacer(minLength: 0)
        }
    }
}

struct BrioWeekWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BrioWeek", provider: BrioProvider()) { entry in
            BrioWeekWidgetView(entry: entry)
        }
        .configurationDisplayName("Mi semana")
        .description("Tu semana con el deporte de cada día y lo que ya has entrenado.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Hoy y semana (mediano: el reloj de la comida y la semana de entrenos)

struct BrioTodayWeekWidgetView: View {
    let entry: BrioEntry

    var body: some View {
        Group {
            if let s = entry.usable {
                content(s)
            } else {
                OpenAppView()
            }
        }
        .widgetURL(URL(string: "brio://hoy"))
        .containerBackground(for: .widget) { Color(uiColor: .systemBackground) }
    }

    private func content(_ s: BrioWidgetSnapshot) -> some View {
        let trained = s.week.filter { $0.state == "done" }.count
        return HStack(spacing: 12) {
            // Cada mitad abre lo suyo: el reloj, Hoy; la semana, el plan.
            Link(destination: URL(string: "brio://hoy")!) {
                TodayDial(s: s, size: 104)
            }
            Link(destination: URL(string: "brio://plan")!) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .firstTextBaseline) {
                        Text("Mi semana")
                            .font(.subheadline.weight(.semibold))
                        Spacer(minLength: 4)
                        Text(trained == 1 ? "1 entrenado" : "\(trained) entrenados")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(moveColor)
                            .lineLimit(1)
                    }
                    HStack(spacing: 0) {
                        ForEach(s.week, id: \.day) { d in
                            VStack(spacing: 4) {
                                Text(d.letter)
                                    .font(.caption2.weight(.bold))
                                    .foregroundStyle(d.isToday ? brioTint : .secondary)
                                WeekDot(d: d, size: 21)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                    Spacer(minLength: 0)
                    HStack(spacing: 10) {
                        tag(moveColor, s.move.label)
                        if let steps = s.steps { tag(stepsColor, steps.label) }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private func tag(_ color: Color, _ text: String) -> some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(text)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
    }
}

struct BrioTodayWeekWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BrioTodayWeek", provider: BrioProvider()) { entry in
            BrioTodayWeekWidgetView(entry: entry)
        }
        .configurationDisplayName("Hoy y semana")
        .description("El reloj de la comida y tu semana de entrenos, juntos.")
        .supportedFamilies([.systemMedium])
    }
}
