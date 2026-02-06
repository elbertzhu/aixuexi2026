import Foundation

enum NetworkError: Error, LocalizedError {
    case invalidURL
    case forbidden
    case serverError
    case unknown
    
    var errorDescription: String? {
        switch self {
        case .forbidden: return "403 Forbidden: Access Denied"
        case .serverError: return "Server Error"
        case .invalidURL: return "Invalid URL"
        case .unknown: return "Unknown Error"
        }
    }
}

class APIService: ObservableObject {
    static let shared = APIService()
    private let baseURL = "http://localhost:3000/api"
    
    @Published var currentUserId: String = "teacher_v3_test" // Default for dev
    
    func getTeacherDashboard() async throws -> [TeacherClass] {
        guard let url = URL(string: "\(baseURL)/teacher/dashboard/summary") else { throw NetworkError.invalidURL }
        
        var request = URLRequest(url: url)
        request.setValue(currentUserId, forHTTPHeaderField: "x-user-id")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode == 403 { throw NetworkError.forbidden }
            if httpResponse.statusCode != 200 { throw NetworkError.serverError }
        }
        
        return try JSONDecoder().decode([TeacherClass].self, from: data)
    }
    
    func getStudentDetail(id: String) async throws -> TeacherStudentDetail {
        guard let url = URL(string: "\(baseURL)/teacher/dashboard/student/\(id)") else { throw NetworkError.invalidURL }
        
        var request = URLRequest(url: url)
        request.setValue(currentUserId, forHTTPHeaderField: "x-user-id")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode == 403 { throw NetworkError.forbidden }
            if httpResponse.statusCode != 200 { throw NetworkError.serverError }
        }
        
        return try JSONDecoder().decode(TeacherStudentDetail.self, from: data)
    }
    
    // v0.4.1: Write Operations
    
    // Teacher: Create Class
    func createClass(name: String) async throws -> ClassResponse {
        guard let url = URL(string: "\(baseURL)/teacher/classes") else { throw NetworkError.invalidURL }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(currentUserId, forHTTPHeaderField: "x-user-id")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["name": name])
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else { throw NetworkError.unknown }
        guard httpResponse.statusCode == 200 else { throw NetworkError.serverError }
        
        return try JSONDecoder().decode(ClassResponse.self, from: data)
    }
    
    // Teacher: Generate/Rotate Invite
    func generateInvite(classId: String) async throws -> TeacherInvite {
        guard let url = URL(string: "\(baseURL)/teacher/classes/\(classId)/invite") else { throw NetworkError.invalidURL }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(currentUserId, forHTTPHeaderField: "x-user-id")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else { throw NetworkError.unknown }
        guard httpResponse.statusCode == 200 else { throw NetworkError.serverError }
        
        return try JSONDecoder().decode(TeacherInvite.self, from: data)
    }
    
    // Teacher: Remove Student
    func removeStudent(classId: String, studentId: String) async throws {
        guard let url = URL(string: "\(baseURL)/teacher/classes/\(classId)/members/\(studentId)") else { throw NetworkError.invalidURL }
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue(currentUserId, forHTTPHeaderField: "x-user-id")
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else { throw NetworkError.unknown }
        guard httpResponse.statusCode == 200 else { throw NetworkError.serverError }
    }
    
    // Student: Join Class
    func joinClass(code: String) async throws {
        guard let url = URL(string: "\(baseURL)/student/join") else { throw NetworkError.invalidURL }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(currentUserId, forHTTPHeaderField: "x-user-id")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["code": code])
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else { throw NetworkError.unknown }
        if httpResponse.statusCode == 404 { throw JoinError.invalidCode }
        guard httpResponse.statusCode == 200 else { throw NetworkError.serverError }
    }
    
    // Student: Leave Class
    func leaveClass(classId: String) async throws {
        guard let url = URL(string: "\(baseURL)/student/leave") else { throw NetworkError.invalidURL }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(currentUserId, forHTTPHeaderField: "x-user-id")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["classId": classId])
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else { throw NetworkError.unknown }
        guard httpResponse.statusCode == 200 else { throw NetworkError.serverError }
    }
}

enum JoinError: Error, LocalizedError {
    case invalidCode
    
    var errorDescription: String? {
        switch self {
        case .invalidCode: return "Invalid or expired invite code"
        }
    }
}
