import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

private let tint = Color(red: 0, green: 0x64 / 255, blue: 0xD2 / 255)
private let activityGreen = Color(red: 0x34 / 255, green: 0xC7 / 255, blue: 0x59 / 255)

/// Live Activity del entreno de gimnasio: en la pantalla bloqueada y en la
/// Dynamic Island se ve el ejercicio, la serie, el peso y las repeticiones, y
/// se puede marcar la serie, ajustar peso y repes o cambiar de ejercicio sin
/// desbloquear el móvil.
@available(iOS 17.0, *)
struct BrioWorkoutLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BrioWorkoutAttributes.self) { context in
            LockScreenView(state: context.state)
                .activityBackgroundTint(Color.black.opacity(0.82))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let s = context.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "dumbbell.fill")
                        .font(.title3)
                        .foregroundStyle(activityGreen)
                        .padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 1) {
                        Text(s.current?.name ?? "Entreno")
                            .font(.subheadline.weight(.semibold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                        Text(setLine(s))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if let end = s.restEnd {
                        Label {
                            Text(timerInterval: Date()...end, countsDown: true)
                                .monospacedDigit()
                                .frame(maxWidth: 52)
                        } icon: {
                            Image(systemName: "timer")
                        }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(activityGreen)
                    } else {
                        Text(s.startDate, style: .timer)
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: 64, alignment: .trailing)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Controls(state: s, compact: true)
                        .padding(.top, 4)
                }
            } compactLeading: {
                Image(systemName: "dumbbell.fill").foregroundStyle(activityGreen)
            } compactTrailing: {
                if let end = s.restEnd {
                    Text(timerInterval: Date()...end, countsDown: true)
                        .monospacedDigit()
                        .frame(maxWidth: 40)
                        .foregroundStyle(activityGreen)
                } else {
                    Text("\(s.setIndex + 1)/\(s.current?.sets.count ?? 0)")
                        .monospacedDigit()
                }
            } minimal: {
                Image(systemName: "dumbbell.fill").foregroundStyle(activityGreen)
            }
            .keylineTint(activityGreen)
        }
    }
}

@available(iOS 17.0, *)
private func setLine(_ s: BrioWorkoutAttributes.ContentState) -> String {
    guard let ex = s.current else { return "" }
    if ex.sets.allSatisfy(\.d) { return "Ejercicio completado" }
    return "Serie \(s.setIndex + 1) de \(ex.sets.count) · ejercicio \(s.focus + 1)/\(s.exercises.count)"
}

@available(iOS 17.0, *)
private func valueText(_ set: BrioLiveSet?, unit: String) -> (weight: String, amount: String) {
    guard let set else { return ("–", "–") }
    let w = set.w.trimmingCharacters(in: .whitespaces).isEmpty ? "0" : set.w
    let amount: String
    switch unit {
    case "reps": amount = "\(set.r.isEmpty ? "–" : set.r) reps"
    case "m": amount = "\(set.r) m"
    case "cal": amount = "\(set.r) cal"
    default: amount = set.r
    }
    return ("\(w) kg", amount)
}

@available(iOS 17.0, *)
private struct LockScreenView: View {
    let state: BrioWorkoutAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Image(systemName: "dumbbell.fill").foregroundStyle(activityGreen)
                Text(state.title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.7))
                    .lineLimit(1)
                Spacer()
                Text("\(state.doneCount)/\(state.totalCount) series")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.white.opacity(0.7))
                Text(state.startDate, style: .timer)
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.white.opacity(0.7))
                    .frame(maxWidth: 52, alignment: .trailing)
            }
            HStack(alignment: .center, spacing: 6) {
                Button(intent: BrioMoveExerciseIntent(delta: -1)) {
                    Image(systemName: "chevron.left").font(.body.weight(.semibold))
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white.opacity(state.focus > 0 ? 0.9 : 0.25))
                .disabled(state.focus == 0)
                VStack(alignment: .leading, spacing: 1) {
                    Text(state.current?.name ?? "Entreno")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(setLine(state))
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.65))
                }
                Spacer(minLength: 4)
                if let end = state.restEnd {
                    Button(intent: BrioSkipRestIntent()) {
                        HStack(spacing: 3) {
                            Image(systemName: "timer")
                            Text(timerInterval: Date()...end, countsDown: true)
                                .monospacedDigit()
                                .frame(maxWidth: 44)
                        }
                        .font(.subheadline.weight(.semibold))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(activityGreen)
                }
                Button(intent: BrioMoveExerciseIntent(delta: 1)) {
                    Image(systemName: "chevron.right").font(.body.weight(.semibold))
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white.opacity(state.focus < state.exercises.count - 1 ? 0.9 : 0.25))
                .disabled(state.focus >= state.exercises.count - 1)
            }
            Controls(state: state, compact: false)
        }
        .padding(14)
    }
}

/// Fila de controles: − peso +, − repes +, y «serie hecha».
@available(iOS 17.0, *)
private struct Controls: View {
    let state: BrioWorkoutAttributes.ContentState
    let compact: Bool

    var body: some View {
        let unit = state.current?.unit ?? "reps"
        let v = valueText(state.currentSet, unit: unit)
        let finished = state.exerciseDone
        HStack(spacing: compact ? 6 : 8) {
            IntentStepper(value: v.weight, minus: BrioAdjustWeightIntent(delta: -2.5), plus: BrioAdjustWeightIntent(delta: 2.5))
            if unit == "reps" {
                IntentStepper(value: v.amount, minus: BrioAdjustRepsIntent(delta: -1), plus: BrioAdjustRepsIntent(delta: 1))
            } else {
                Text(v.amount)
                    .font(.subheadline.weight(.semibold).monospacedDigit())
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
            }
            Button(intent: BrioCompleteSetIntent()) {
                Image(systemName: "checkmark")
                    .font(.body.weight(.bold))
                    .frame(width: compact ? 40 : 46, height: compact ? 36 : 40)
                    .background(finished ? Color.white.opacity(0.15) : activityGreen, in: Capsule())
                    .foregroundStyle(.white)
            }
            .buttonStyle(.plain)
            .disabled(finished)
            .accessibilityLabel("Serie hecha")
        }
    }
}

@available(iOS 17.0, *)
private struct IntentStepper<Minus: AppIntent, Plus: AppIntent>: View {
    let value: String
    let minus: Minus
    let plus: Plus

    var body: some View {
        HStack(spacing: 0) {
            Button(intent: minus) {
                Image(systemName: "minus").frame(width: 30, height: 36)
            }
            .buttonStyle(.plain)
            Text(value)
                .font(.subheadline.weight(.semibold).monospacedDigit())
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(maxWidth: .infinity)
            Button(intent: plus) {
                Image(systemName: "plus").frame(width: 30, height: 36)
            }
            .buttonStyle(.plain)
        }
        .foregroundStyle(.white)
        .background(Color.white.opacity(0.14), in: Capsule())
    }
}
