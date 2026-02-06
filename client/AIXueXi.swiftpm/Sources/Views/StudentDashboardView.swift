import SwiftUI

struct StudentDashboardView: View {
    @StateObject var vm = StudentDashboardViewModel()
    @ObservedObject var api = APIService.shared
    
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
                        ProgressView("加载中...")
                    } else if let err = vm.error {
                        ErrorView(message: err, retryAction: { vm.load() })
                    } else if vm.joinedClasses.isEmpty {
                        // Empty State with Guidance
                        VStack(spacing: 24) {
                            Image(systemName: "person.3.slash")
                                .font(.system(size: 60))
                                .foregroundColor(.secondary)
                            
                            VStack(spacing: 8) {
                                Text("暂无加入的班级")
                                    .font(.title2)
                                    .fontWeight(.semibold)
                                
                                Text("输入邀请码加入班级，开始学习")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            
                            Button {
                                vm.showJoinSheet = true
                            } label: {
                                Label("加入班级", systemImage: "person.badge.plus")
                                    .font(.headline)
                                    .padding(.horizontal, 24)
                                    .padding(.vertical, 12)
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        List {
                            ForEach(vm.joinedClasses) { cls in
                                Section(header: Text(cls.className)) {
                                    HStack {
                                        Text("学生数：\(cls.studentCount)")
                                        Spacer()
                                    }
                                    
                                    Button(role: .destructive) {
                                        vm.leaveClassId = cls.id
                                        vm.showLeaveAlert = true
                                    } label: {
                                        Label("退出班级", systemImage: "rectangle.portrait.and.arrow.right")
                                    }
                                }
                            }
                            
                            Section {
                                Button {
                                    vm.showJoinSheet = true
                                } label: {
                                    Label("加入班级", systemImage: "person.badge.plus")
                                }
                            }
                        }
                        .listStyle(InsetGroupedListStyle())
                    }
                }
            }
            .navigationTitle("我的班级")
            .onAppear { vm.load() }
            .sheet(isPresented: $vm.showJoinSheet) {
                JoinClassSheet(api: api, onJoin: {
                    vm.showJoinSheet = false
                    vm.load()
                })
            }
            .alert("退出班级？", isPresented: $vm.showLeaveAlert) {
                Button("取消", role: .cancel) {}
                Button("退出", role: .destructive) {
                    if let id = vm.leaveClassId {
                        vm.leave(classId: id)
                    }
                }
            } message: {
                Text("确定要退出此班级吗？")
            }
        }
    }
}

struct JoinClassSheet: View {
    @ObservedObject var api: APIService.shared
    @Environment(\.dismiss) var dismiss
    @State private var code: String = ""
    @State private var isJoining = false
    @State private var errorMsg: String?
    
    let onJoin: () -> Void
    
    var body: some View {
        NavigationView {
            Form {
                Section("输入邀请码") {
                    HStack {
                        TextField("6位邀请码", text: $code)
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                            .font(.system(size: 20, weight: .bold, design: .monospaced))
                            .onChange(of: code) { newValue in
                                // Auto uppercase and trim spaces
                                code = newValue.uppercased().trimmingCharacters(in: .whitespaces)
                            }
                        
                        if !code.isEmpty {
                            Button {
                                code = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.secondary)
                            }
                            .buttonStyle(BorderlessButtonStyle())
                        }
                        
                        Button {
                            UIPasteboard.general.string = code
                        } label: {
                            Image(systemName: "doc.on.clipboard")
                                .foregroundColor(.blue)
                        }
                        .buttonStyle(BorderlessButtonStyle())
                    }
                }
                
                if let err = errorMsg {
                    Section {
                        Text(errorMessage(err))
                            .foregroundColor(.red)
                    }
                }
                
                Section {
                    Button("加入") {
                        join()
                    }
                    .disabled(code.count != 6 || isJoining)
                }
            }
            .navigationTitle("加入班级")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
            }
            .interactiveDismissDisabled(isJoining)
            .onAppear {
                // Auto-paste from clipboard if available
                if let pasted = UIPasteboard.general.string, pasted.count == 6 {
                    code = pasted.uppercased().trimmingCharacters(in: .whitespaces)
                }
            }
        }
    }
    
    func join() {
        isJoining = true
        errorMsg = nil
        Task {
            do {
                try await api.joinClass(code: code)
                await MainActor.run {
                    isJoining = false
                    onJoin()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isJoining = false
                    errorMsg = error.localizedDescription
                }
            }
        }
    }
    
    private func errorMessage(_ msg: String) -> String {
        if msg.contains("403") || msg.contains("forbidden") {
            return "无权限"
        }
        if msg.contains("network") || msg.contains("Network") {
            return "网络异常，请重试"
        }
        if msg.contains("rate") || msg.contains("Rate") || msg.contains("429") {
            return "请求过于频繁，请稍后再试"
        }
        if msg.contains("过期") || msg.contains("invalid") {
            return "邀请码无效或已过期"
        }
        if msg.contains("limit") || msg.contains("上限") {
            return "邀请码已达使用上限"
        }
        return "操作失败：\(msg)"
    }
}

@MainActor
class StudentDashboardViewModel: ObservableObject {
    @Published var joinedClasses: [TeacherClass] = []
    @Published var isLoading = false
    @Published var error: String? = nil
    @Published var showJoinSheet = false
    @Published var showLeaveAlert = false
    @Published var leaveClassId: String? = nil
    
    private let api = APIService.shared
    
    var currentUserId: String {
        api.currentUserId
    }
    
    func load() {
        isLoading = true
        error = nil
        
        Task {
            do {
                // v0.4.1: Use teacher dashboard as fallback for demo
                let allClasses = try await api.getTeacherDashboard()
                self.joinedClasses = []
            } catch NetworkError.forbidden {
                self.error = "无权限：请切换为学生账号"
            } catch {
                self.error = "加载失败：\(error.localizedDescription)"
            }
            isLoading = false
        }
    }
    
    func leave(classId: String) {
        Task {
            do {
                try await api.leaveClass(classId: classId)
                load()
            } catch {
                self.error = "退出失败：\(error.localizedDescription)"
            }
        }
    }
    
    func updateUserId(_ id: String) {
        api.currentUserId = id
        load()
    }
}
