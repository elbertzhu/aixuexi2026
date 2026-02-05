import SwiftUI

struct TeacherDashboardView: View {
    @StateObject var vm = TeacherDashboardViewModel()
    @ObservedObject var api = APIService.shared
    
    var body: some View {
        NavigationView {
            VStack {
                // Identity Switcher (Dev Tool)
                Picker("Identity", selection: $api.currentUserId) {
                    Text("Teacher").tag("teacher_v3_test")
                    Text("Student").tag("student_v3_1")
                    Text("Parent").tag("parent_v3_test")
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                .onChange(of: api.currentUserId) { newValue in
                    vm.updateUserId(newValue)
                }
                
                Group {
                    if vm.isLoading {
                        ProgressView("Loading...")
                    } else if vm.isForbidden {
                        ForbiddenView()
                    } else if let err = vm.error {
                        ErrorView(message: err, retryAction: { vm.load() })
                    } else {
                        List {
                            ForEach(vm.classes) { cls in
                                Section(header: Text(cls.className)) {
                                    ForEach(cls.students) { student in
                                        NavigationLink(destination: TeacherStudentDetailView(studentId: student.id)) {
                                            StudentRow(student: student)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Teacher Dashboard")
            .onAppear { vm.load() }
        }
    }
}

struct StudentRow: View {
    let student: TeacherStudentSummary
    
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(student.id).font(.headline)
                Text("Last Active: \(formatDate(student.last_active))")
                    .font(.caption).foregroundColor(.secondary)
            }
            Spacer()
            
            // Core Metrics
            VStack(alignment: .trailing) {
                Text(String(format: "%.0f%% Acc", student.accuracy * 100))
                    .foregroundColor(colorForAccuracy(student.accuracy))
                    .bold()
                
                if student.srs_pending > 0 {
                    Text("\(student.srs_pending) Due")
                        .font(.caption)
                        .padding(4)
                        .background(Color.orange.opacity(0.2))
                        .cornerRadius(4)
                }
            }
        }
    }
    
    func colorForAccuracy(_ acc: Double) -> Color {
        if acc >= 0.8 { return .green }
        if acc >= 0.6 { return .yellow }
        return .red
    }
    
    func formatDate(_ ts: Double?) -> String {
        guard let ts = ts else { return "Never" }
        let date = Date(timeIntervalSince1970: ts / 1000)
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }
}

struct ForbiddenView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "hand.raised.fill")
                .font(.system(size: 60))
                .foregroundColor(.red)
            Text("403 Forbidden")
                .font(.title)
                .bold()
            Text("You do not have permission to access the Teacher Dashboard.")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

struct ErrorView: View {
    let message: String
    let retryAction: () -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 50))
                .foregroundColor(.orange)
            Text("Error")
                .font(.headline)
            Text(message)
                .foregroundColor(.secondary)
            Button("Retry") {
                retryAction()
            }
            .padding()
            .background(Color.blue.opacity(0.1))
            .cornerRadius(8)
        }
        .padding()
    }
}
