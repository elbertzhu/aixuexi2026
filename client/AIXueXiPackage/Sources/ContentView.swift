import SwiftUI

public struct AIXueXiRootView: View {
    public init() {}
    
    public var body: some View {
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
