import SwiftUI

struct TeacherDashboardView: View {
    @StateObject var vm = TeacherDashboardViewModel()
    @ObservedObject var api = APIService.shared
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
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
                        // Skeleton / Loading Experience
                        LoadingSkeletonView()
                    } else if vm.isForbidden {
                        ForbiddenView()
                    } else if let err = vm.error {
                        ErrorView(message: err, retryAction: { vm.load() })
                    } else {
                        // Dashboard Content
                        VStack(spacing: 0) {
                            // Controls: Search + Sort + Filter
                            DashboardControls(vm: vm)
                                .padding(.horizontal)
                                .padding(.bottom, 8)
                            
                            List {
                                ForEach(vm.filteredClasses) { cls in
                                    Section(header: HStack {
                                        Text("\(cls.className) (\(cls.students.count))")
                                        Spacer()
                                        Button {
                                            vm.selectedClassForInvite = cls.id
                                            vm.showInviteSheet = true
                                        } label: {
                                            Image(systemName: "qrcode")
                                        }
                                        .buttonStyle(BorderlessButtonStyle())
                                    }) {
                                        if cls.students.isEmpty {
                                            Text("No matching students")
                                                .foregroundColor(.secondary)
                                                .italic()
                                        } else {
                                            ForEach(cls.students) { student in
                                                HStack {
                                                    NavigationLink(destination: TeacherStudentDetailView(studentId: student.id)) {
                                                        StudentRow(student: student)
                                                    }
                                                    // v0.4.1: Kick Button
                                                    Button {
                                                        vm.studentToKick = student
                                                        vm.showKickAlert = true
                                                    } label: {
                                                        Image(systemName: "person.badge.minus")
                                                            .foregroundColor(.red)
                                                    }
                                                    .buttonStyle(BorderlessButtonStyle())
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            .listStyle(InsetGroupedListStyle())
                        }
                    }
                }
            }
            .navigationTitle("Teacher Dashboard")
            .onAppear { vm.load() }
            .sheet(isPresented: $vm.showCreateSheet) {
                CreateClassSheet(api: api, onCreate: {
                    vm.showCreateSheet = false
                    vm.load()
                })
            }
            .sheet(isPresented: $vm.showInviteSheet) {
                if let classId = vm.selectedClassForInvite {
                    InviteCodeSheet(api: api, classId: classId, onRotate: {
                        vm.load()
                    })
                }
            }
            .alert("Kick Student?", isPresented: $vm.showKickAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Kick", role: .destructive) {
                    if let student = vm.studentToKick, let classId = vm.selectedClassId {
                        vm.kick(studentId: student.id, from: classId)
                    }
                }
            } message: {
                Text("Are you sure you want to remove \(vm.studentToKick?.id ?? "this student")?")
            }
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }
}

// MARK: - Subcomponents

struct DashboardControls: View {
    @ObservedObject var vm: TeacherDashboardViewModel
    
    var body: some View {
        VStack(spacing: 12) {
            // Search
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                TextField("Search Student ID", text: $vm.searchText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
            }
            
            // Filters Row
            HStack {
                // Class Picker
                if !vm.availableClasses.isEmpty {
                    Picker("Class", selection: $vm.selectedClassId) {
                        Text("All Classes").tag(String?.none)
                        ForEach(vm.availableClasses) { cls in
                            Text(cls.className).tag(String?.some(cls.id))
                        }
                    }
                    .pickerStyle(MenuPickerStyle())
                    .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    Text("No Classes")
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                
                Spacer()
                
                // Sort Picker
                Picker("Sort", selection: $vm.sortOption) {
                    ForEach(StudentSortOption.allCases) { opt in
                        Text(opt.rawValue).tag(opt)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .frame(maxWidth: 200)
                
                // v0.4.1: Create Class Button
                Button {
                    vm.showCreateSheet = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                }
            }
        }
    }
}

struct StudentRow: View {
    let student: TeacherStudentSummary
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(student.id)
                    .font(.headline)
                Text("Active: \(formatDate(student.last_active))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            
            // Core Metrics
            HStack(spacing: 12) {
                // Accuracy Badge
                HStack(spacing: 2) {
                    Image(systemName: student.accuracy < 0.6 ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                        .font(.caption)
                    Text(String(format: "%.0f%%", student.accuracy * 100))
                        .bold()
                }
                .foregroundColor(colorForAccuracy(student.accuracy))
                
                // SRS Badge (Only if non-zero)
                if student.srs_pending > 0 {
                    HStack(spacing: 2) {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.caption)
                        Text("\(student.srs_pending)")
                    }
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.orange.opacity(0.15))
                    .foregroundColor(.orange)
                    .cornerRadius(12)
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    func colorForAccuracy(_ acc: Double) -> Color {
        if acc >= 0.8 { return .green }
        if acc >= 0.6 { return .yellow }
        return .red
    }
    
    func formatDate(_ ts: Double?) -> String {
        guard let ts = ts else { return "Never" }
        // Simple relative time or short date
        let date = Date(timeIntervalSince1970: ts / 1000)
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct LoadingSkeletonView: View {
    var body: some View {
        List {
            ForEach(0..<3) { section in
                Section(header: Text("Class Loading...").redacted(reason: .placeholder)) {
                    ForEach(0..<3) { row in
                        HStack {
                            VStack(alignment: .leading) {
                                Text("Student Name Placeholder")
                                    .font(.headline)
                                Text("Last Active: Yesterday")
                                    .font(.caption)
                            }
                            Spacer()
                            Text("85% Acc")
                        }
                        .redacted(reason: .placeholder)
                        .padding(.vertical, 4)
                    }
                }
            }
        }
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
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
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
                .multilineTextAlignment(.center)
            
            Button(action: retryAction) {
                Text("Retry")
                    .fontWeight(.bold)
                    .padding()
                    .frame(width: 120)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
        .padding()
    }
}
