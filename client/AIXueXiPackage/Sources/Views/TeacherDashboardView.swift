import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

struct TeacherDashboardView: View {
    @StateObject var vm = TeacherDashboardViewModel()
    @ObservedObject var api = APIService.shared
    @State private var showAuditSheet = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Identity Switcher (Dev Tool)
                Picker("身份", selection: $api.currentUserId) {
                    Text("教师").tag("teacher_v3_test")
                    Text("学生").tag("student_v3_1")
                    Text("家长").tag("parent_v3_test")
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                .onChange(of: api.currentUserId) { newValue in
                    vm.updateUserId(newValue)
                }
                
                Group {
                    if vm.isLoading {
                        LoadingSkeletonView()
                    } else if vm.isForbidden {
                        ForbiddenView()
                    } else if let err = vm.error {
                        ErrorView(message: err, retryAction: { vm.load() })
                    } else if vm.filteredClasses.isEmpty {
                        // Empty State
                        VStack(spacing: 24) {
                            Image(systemName: "rectangle.stack.badge.plus")
                                .font(.system(size: 60))
                                .foregroundColor(.secondary)
                            
                            VStack(spacing: 8) {
                                Text("暂无班级")
                                    .font(.title2)
                                    .fontWeight(.semibold)
                                
                                Text("创建一个新班级来管理学生")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            
                            Button {
                                vm.showCreateSheet = true
                            } label: {
                                Label("创建班级", systemImage: "plus.circle.fill")
                                    .font(.headline)
                                    .padding(.horizontal, 24)
                                    .padding(.vertical, 12)
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        VStack(spacing: 0) {
                            // Controls
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
                                            Text("暂无学生")
                                                .foregroundColor(.secondary)
                                                .italic()
                                        } else {
                                            ForEach(cls.students) { student in
                                                HStack {
                                                    NavigationLink(destination: TeacherStudentDetailView(studentId: student.id)) {
                                                        StudentRow(student: student)
                                                    }
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
                            .listStyle(platformListStyle)
                        }
                    }
                }
            }
            .navigationTitle("教师仪表盘")
            .toolbar {
                #if canImport(UIKit)
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack {
                        // v0.6.0: Admin Global Audit Entry
                        Menu {
                            Button {
                                showAuditSheet = true
                            } label: {
                                Label("审计记录", systemImage: "list.clipboard")
                            }
                            Button {
                                // v0.6.0: Admin Global Audit
                            } label: {
                                Label("全局审计 (Admin)", systemImage: "globe")
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }
                }
                #else
                ToolbarItem(placement: .automatic) {
                    Menu {
                        Button {
                            showAuditSheet = true
                        } label: {
                            Label("审计记录", systemImage: "list.clipboard")
                        }
                        Button {
                            // v0.6.0: Admin Global Audit
                        } label: {
                            Label("全局审计 (Admin)", systemImage: "globe")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
                #endif
            }
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
            .sheet(isPresented: $showAuditSheet) {
                AdminAuditView()
            }
            .alert("移除学生？", isPresented: $vm.showKickAlert) {
                Button("取消", role: .cancel) {}
                Button("移除", role: .destructive) {
                    if let student = vm.studentToKick, let classId = vm.selectedClassId {
                        vm.kick(studentId: student.id, from: classId)
                    }
                }
            } message: {
                Text("确定要移除 \(vm.studentToKick?.id ?? "该学生") 吗？")
            }
        }
        #if canImport(UIKit)
        .navigationViewStyle(StackNavigationViewStyle())
        #endif
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
                TextField("搜索学生 ID", text: $vm.searchText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
            }
            
            // Filters Row
            HStack {
                if !vm.availableClasses.isEmpty {
                    Picker("班级", selection: $vm.selectedClassId) {
                        Text("全部班级").tag(String?.none)
                        ForEach(vm.availableClasses) { cls in
                            Text(cls.className).tag(String?.some(cls.id))
                        }
                    }
                    .pickerStyle(MenuPickerStyle())
                    .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    Text("暂无班级")
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                
                Spacer()
                
                Picker("排序", selection: $vm.sortOption) {
                    ForEach(StudentSortOption.allCases) { opt in
                        Text(opt.rawValue).tag(opt)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .frame(maxWidth: 200)
                
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
                Text("活跃：\(formatDate(student.last_active))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            
            HStack(spacing: 12) {
                // Accuracy Badge
                HStack(spacing: 2) {
                    Image(systemName: student.accuracy < 0.6 ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                        .font(.caption)
                    Text(String(format: "%.0f%%", student.accuracy * 100))
                        .bold()
                }
                .foregroundColor(colorForAccuracy(student.accuracy))
                
                // SRS Badge
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
        guard let ts = ts else { return "从未" }
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
                Section(header: Text("加载中...").redacted(reason: .placeholder)) {
                    ForEach(0..<3) { row in
                        HStack {
                            VStack(alignment: .leading) {
                                Text("学生占位符")
                                    .font(.headline)
                                Text("活跃：昨天")
                                    .font(.caption)
                            }
                            Spacer()
                            Text("85% 正确率")
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
            Text("403 无权限")
                .font(.title)
                .bold()
            Text("您无权访问教师仪表盘")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(platformGroupedBackground)
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
            Text("出错了")
                .font(.headline)
            Text(unifiedErrorMessage(message))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button(action: retryAction) {
                Text("重试")
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
    
    private func unifiedErrorMessage(_ msg: String) -> String {
        if msg.contains("403") || msg.contains("forbidden") {
            return "无权限"
        }
        if msg.contains("network") || msg.contains("Network") {
            return "网络异常，请重试"
        }
        return msg
    }
}

private var platformGroupedBackground: Color {
    #if canImport(UIKit)
    return Color(uiColor: .systemGroupedBackground)
    #elseif canImport(AppKit)
    return Color(nsColor: .windowBackgroundColor)
    #else
    return Color.gray.opacity(0.1)
    #endif
}

private var platformListStyle: some ListStyle {
    #if canImport(UIKit)
    return InsetGroupedListStyle()
    #else
    return SidebarListStyle()
    #endif
}
