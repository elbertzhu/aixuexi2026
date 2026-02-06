import Foundation

enum NetworkError: Error, LocalizedError {
    case invalidURL
    case forbidden
    case serverError
    case rateLimited
    case unknown
    
    var errorDescription: String? {
        switch self {
        case .forbidden: return "403 无权限"
        case .serverError: return "服务器错误"
        case .invalidURL: return "无效 URL"
        case .rateLimited: return "请求过于频繁，请稍后再试"
        case .unknown: return "未知错误"
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
    
    // Teacher: Generate/Rotate Invite (v0.5.1: Updated to return usage info)
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
    
    // Student: Join Class (v0.5.1: Added 429 handling)
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
        if httpResponse.statusCode == 429 { throw NetworkError.rateLimited }
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
    
    // v0.5.1: Teacher Audit Logs (Legacy)
    // v0.5.2: Updated to use paginated endpoint
    func getAuditLogs(classId: String, limit: Int = 100) async throws -> [AuditLog] {
        let result = try await getAuditLogsPaginated(
            classId: classId,
            action: nil,
            actorRole: nil,
            offset: 0,
            limit: limit
        )
        return result.items
    }
    
    // v0.5.2: Paginated Audit Logs
    func getAuditLogsPaginated(
        classId: String,
        action: String?,
        actorRole: String?,
        offset: Int,
        limit: Int
    ) async throws -> AuditLogResponse {
        var urlStr = "\(baseURL)/teacher/audit?classId=\(classId)&limit=\(limit)&offset=\(offset)"
        if let a = action { urlStr += "&action=\(a)" }
        if let r = actorRole { urlStr += "&actor_role=\(r)" }
        
        guard let url = URL(string: urlStr) else { throw NetworkError.invalidURL }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(currentUserId, forHTTPHeaderField: "x-user-id")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else { throw NetworkError.unknown }
        if httpResponse.statusCode == 403 { throw NetworkError.forbidden }
        guard httpResponse.statusCode == 200 else { throw NetworkError.serverError }
        
        return try JSONDecoder().decode(AuditLogResponse.self, from: data)
    }
    
    // v0.5.2: Export Audit Logs as CSV
    func exportAuditLogs(
        classId: String,
        action: String?,
        actorRole: String?
    ) async throws -> String {
        var urlStr = "\(baseURL)/teacher/audit/export?classId=\(classId)"
        if let a = action { urlStr += "&action=\(a)" }
        if let r = actorRole { urlStr += "&actor_role=\(r)" }
        
        guard let url = URL(string: urlStr) else { throw NetworkError.invalidURL }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(currentUserId, forHTTPHeaderField: "x-user-id")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else { throw NetworkError.unknown }
        if httpResponse.statusCode == 403 { throw NetworkError.forbidden }
        guard httpResponse.statusCode == 200 else { throw NetworkError.serverError }
        
        return String(data: data, encoding: .utf8) ?? ""
    }
}

enum JoinError: Error, LocalizedError {
    case invalidCode
    
    var errorDescription: String? {
        switch self {
        case .invalidCode: return "邀请码无效、已过期或已达使用上限"
        }
    }
}

// v0.5.1: Audit Log Model
struct AuditLog: Codable, Identifiable {
    let id: Int
    let timestamp: Int
    let actor_id: String
    let actor_role: String
    let action: String
    let target: String
    let result: String
    let reason: String?
}

// v0.5.2: Paginated Audit Response
struct AuditLogResponse: Codable {
    let items: [AuditLog]
    let total: Int
    let limit: Int
    let offset: Int
}
