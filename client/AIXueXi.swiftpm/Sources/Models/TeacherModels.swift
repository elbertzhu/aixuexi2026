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
