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
                
                StudentDashboardView()
                    .tabItem {
                        Label("Student", systemImage: "book.fill")
                    }
            }
        }
    }
}
