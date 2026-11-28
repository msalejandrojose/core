import UIKit
import Capacitor

/// Controlador principal de Capacitor con los plugins propios de Brío (los
/// que viven en el target de la app y no en un pod). Lo engancha
/// `native:prepare` en Main.storyboard y SceneDelegate.swift
/// (`ios.rootViewController` en native.config.yml).
class BrioBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(BrioLiveActivityPlugin())
        bridge?.registerPluginInstance(BrioWidgetsPlugin())
    }
}
