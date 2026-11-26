import SwiftUI
import WidgetKit

@main
struct BrioWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 17.0, *) {
            BrioWorkoutLiveActivity()
            // Pantalla de inicio: Hoy, Entreno de hoy y Mi semana.
            BrioTodayWidget()
            BrioWorkoutWidget()
            BrioWeekWidget()
        }
    }
}
