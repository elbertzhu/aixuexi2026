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
            
            // Sort
            students.sort { s1, s2 in
                switch sortOption {
                case .activity:
                    if s1.activity_7d != s2.activity_7d {
                        return s1.activity_7d > s2.activity_7d
                    }
                    return s1.accuracy > s2.accuracy
                    
                case .accuracy:
                    return s1.accuracy > s2.accuracy
                    
                case .srsCount:
                    return s1.srs_pending > s2.srs_pending
                }
            }
            
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
            } catch NetworkError.forbidden {
                isForbidden = true
                error = "Access Denied (403)"
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        }
    }
    
    // v0.4.1: Write Actions
    @Published var showCreateSheet = false
    @Published var showInviteSheet = false
    @Published var selectedClassForInvite: String?
    @Published var showKickAlert = false
    @Published var studentToKick: TeacherStudentSummary?
    
    func createClass(name: String) {
        isLoading = true
        Task {
            do {
                _ = try await api.createClass(name: name)
                await MainActor.run {
                    isLoading = false
                    load()
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
    
    func generateInvite() {
        guard let classId = selectedClassForInvite else { return }
        isLoading = true
        Task {
            do {
                _ = try await api.generateInvite(classId: classId)
                await MainActor.run {
                    isLoading = false
                    load()
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
    
    func kick(studentId: String, from classId: String) {
        isLoading = true
        Task {
            do {
                try await api.removeStudent(classId: classId, studentId: studentId)
                await MainActor.run {
                    isLoading = false
                    load()
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
    
    func updateUserId(_ id: String) {
        api.currentUserId = id
        load()
    }
}
