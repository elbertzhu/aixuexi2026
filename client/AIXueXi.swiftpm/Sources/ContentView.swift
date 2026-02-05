import SwiftUI

@main
struct AIXueXiApp: App {
    var body: some Scene {
        WindowGroup {
            TabView {
                TeacherDashboardView()
                    .tabItem {
                        Label("Teacher", systemImage: "graduationcap.fill")
                    }
                
                Text("Student Placeholder")
                    .tabItem {
                        Label("Learn", systemImage: "book.fill")
                    }
            }
        }
    }
}
