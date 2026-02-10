import SwiftUI

struct TeacherStudentDetailView: View {
    let studentId: String
    @State private var detail: TeacherStudentDetail?
    @State private var loading = true
    @State private var error: String?
    
    var body: some View {
        VStack {
            if loading {
                ProgressView()
            } else if let detail = detail {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        Text("Student ID: \(detail.id)")
                            .font(.title2)
                            .padding(.bottom)
                        
                        // Metrics Grid
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 20) {
                            MetricCard(title: "Accuracy", value: String(format: "%.1f%%", detail.accuracy * 100))
                            MetricCard(title: "SRS Pending", value: "\(detail.srs_pending)")
                            MetricCard(title: "Activity (7d)", value: "\(detail.activity_7d) events")
                            MetricCard(title: "Last Active", value: formatDate(detail.last_active))
                        }
                    }
                    .padding()
                }
            } else {
                Text(error ?? "Unknown error")
            }
        }
        .navigationTitle("Student Detail")
        .task {
            do {
                detail = try await APIService.shared.getStudentDetail(id: studentId)
                loading = false
            } catch {
                self.error = error.localizedDescription
                loading = false
            }
        }
    }
    
    func formatDate(_ ts: Double?) -> String {
        guard let ts = ts else { return "-" }
        let date = Date(timeIntervalSince1970: ts / 1000)
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct MetricCard: View {
    let title: String
    let value: String
    
    var body: some View {
        VStack {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(value)
                .font(.title3)
                .bold()
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(10)
    }
}
