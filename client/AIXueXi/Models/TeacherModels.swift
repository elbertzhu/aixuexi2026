import Foundation

struct TeacherClass: Codable, Identifiable {
    let id: String
    let className: String
    let studentCount: Int
    let students: [TeacherStudentSummary]
    
    // Mapping for API response where id might be different
    enum CodingKeys: String, CodingKey {
        case id = "classId"
        case className
        case studentCount
        case students
    }
}

struct TeacherStudentSummary: Codable, Identifiable {
    let id: String
    let accuracy: Double
    let srs_pending: Int
    let activity_7d: Int
    let last_active: Double? // Timestamp
}

struct TeacherStudentDetail: Codable, Identifiable {
    let id: String
    let accuracy: Double
    let srs_pending: Int
    let activity_7d: Int
    let last_active: Double?
}

// v0.4.1: Invite Models
// v0.5.1: Added usage_limit, usage_count, expires_at
struct TeacherInvite: Codable {
    let code: String
    let class_id: String
    let status: String
    let usage_limit: Int?
    let usage_count: Int?
    let expires_at: Int?
    let created_at: Int?
}

struct JoinRequest: Codable {
    let code: String
}

struct ClassResponse: Codable {
    let id: String
    let name: String
    let teacherId: String?
}
