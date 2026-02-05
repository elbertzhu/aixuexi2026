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
}
