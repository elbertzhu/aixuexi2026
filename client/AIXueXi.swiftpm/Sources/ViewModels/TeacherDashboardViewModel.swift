import SwiftUI

enum StudentSortOption: String, CaseIterable, Identifiable {
    case activity = "Activity"
    case accuracy = "Accuracy"
    case srsCount = "SRS Pending"
    
    var id: String { rawValue }
}

@MainActor
class TeacherDashboardViewModel: ObservableObject {
    // Raw data from API
    private var allClasses: [TeacherClass] = []
    
    @Published var isLoading = false
    @Published var error: String? = nil
    @Published var isForbidden = false
    
    // UI Filters
    @Published var searchText: String = ""
    @Published var selectedClassId: String? = nil // nil = "All"
    @Published var sortOption: StudentSortOption = .activity
    
    private let api = APIService.shared
    
    // Computed property for UI to bind to
    var filteredClasses: [TeacherClass] {
        // 1. Filter by Class
        let classSubset = (selectedClassId == nil) 
            ? allClasses 
            : allClasses.filter { $0.id == selectedClassId }
        
        // 2. Process each class (Filter Students + Sort)
        return classSubset.compactMap { cls -> TeacherClass? in
            var students = cls.students
            
            // Search Filter (ID Case Insensitive)
            if !searchText.isEmpty {
                students = students.filter { 
                    $0.id.localizedCaseInsensitiveContains(searchText) 
                }
            }
            
            // Skip empty classes if searching (optional UX choice, keeping for clarity)
            // if students.isEmpty && !searchText.isEmpty { return nil }
            
            // Sort
            students.sort { s1, s2 in
                switch sortOption {
                case .activity:
                    // Primary: Activity (desc), Secondary: Accuracy (desc)
                    if s1.activity_7d != s2.activity_7d {
                        return s1.activity_7d > s2.activity_7d
                    }
                    return s1.accuracy > s2.accuracy
                    
                case .accuracy:
                    // Primary: Accuracy (asc - highlight struggling?), Let's do Ascending to see low scores top?
                    // Spec says "sort", usually means best first or worst first. 
                    // Let's assume Worst First for Teachers to intervene? Or Best?
                    // Usually "Ranking" -> High to Low.
                    return s1.accuracy > s2.accuracy
                    
                case .srsCount:
                    return s1.srs_pending > s2.srs_pending
                }
            }
            
            // Return new copy of class with filtered students
            return TeacherClass(
                id: cls.id,
                className: cls.className,
                studentCount: cls.studentCount,
                students: students
            )
        }
    }
    
    // Classes for Picker
    var availableClasses: [TeacherClass] {
        allClasses
    }
    
    func load() {
        isLoading = true
        error = nil
        isForbidden = false
        
        Task {
            do {
                allClasses = try await api.getTeacherDashboard()
                
                // Set default class if one exists and we want to default to something? 
                // Spec says: "If no classes hierarchy -> All/Default placeholder". 
                // We'll stick to 'All' (nil) as default.
                
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
