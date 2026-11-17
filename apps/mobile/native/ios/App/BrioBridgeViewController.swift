import UIKit
import Capacitor

/// Controlador principal de Capacitor con los plugins propios de Brío (los
/// que viven en el target de la app y no en un pod). Lo engancha el script
/// `scripts/ios-live-activity.rb` en Main.storyboard.
class BrioBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(BrioLiveActivityPlugin())
    }
}
