import SwiftUI

@MainActor
class TeacherDashboardViewModel: ObservableObject {
    @Published var classes: [TeacherClass] = []
    @Published var isLoading = false
    @Published var error: String? = nil
    @Published var isForbidden = false
    
    private let api = APIService.shared
    
    func load() {
        isLoading = true
        error = nil
        isForbidden = false
        
        Task {
            do {
                classes = try await api.getTeacherDashboard()
            } catch NetworkError.forbidden {
                isForbidden = true
                error = "Access Denied (403)"
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        }
    }
    
    func updateUserId(_ id: String) {
        api.currentUserId = id
        load() // Reload on identity switch
    }
}
