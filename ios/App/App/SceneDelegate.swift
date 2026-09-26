import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = GameViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// Zumbi Bot em tela cheia: esconde o indicador da Tela de Início e segura os gestos do sistema nas bordas (o primeiro
/// toque perto da borda vai para os controles do jogo, não para o iOS).
class GameViewController: CAPBridgeViewController {
    override var prefersHomeIndicatorAutoHidden: Bool {
        return true
    }

    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge {
        return .all
    }
}
