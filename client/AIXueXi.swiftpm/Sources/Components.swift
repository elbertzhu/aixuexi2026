import SwiftUI

struct CreateClassSheet: View {
    @ObservedObject var api: APIService.shared
    @Environment(\.dismiss) var dismiss
    @State private var className: String = ""
    @State private var isCreating = false
    @State private var errorMsg: String?
    
    let onCreate: () -> Void
    
    var body: some View {
        NavigationView {
            Form {
                Section("班级名称") {
                    TextField("例如：物理 101", text: $className)
                }
                
                if let err = errorMsg {
                    Section {
                        Text(errorMessage(err))
                            .foregroundColor(.red)
                    }
                }
                
                Section {
                    Button("创建") {
                        isCreating = true
                        errorMsg = nil
                        Task {
                            do {
                                try await api.createClass(name: className)
                                await MainActor.run {
                                    isCreating = false
                                    onCreate()
                                    dismiss()
                                }
                            } catch {
                                await MainActor.run {
                                    isCreating = false
                                    errorMsg = error.localizedDescription
                                }
                            }
                        }
                    }
                    .disabled(className.isEmpty || isCreating)
                }
            }
            .navigationTitle("新建班级")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
            }
            .interactiveDismissDisabled(isCreating)
        }
    }
    
    private func errorMessage(_ msg: String) -> String {
        if msg.contains("403") || msg.contains("forbidden") {
            return "无权限：请使用教师账号登录"
        }
        if msg.contains("network") || msg.contains("Network") {
            return "网络异常，请重试"
        }
        return "操作失败：\(msg)"
    }
}

struct InviteCodeSheet: View {
    @ObservedObject var api: APIService.shared
    let classId: String
    let onRotate: () -> Void
    
    @Environment(\.dismiss) var dismiss
    @State private var code: String?
    @State private var isLoading = false
    @State private var errorMsg: String?
    @State private var showCopiedToast = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                if let c = code {
                    Text("邀请码")
                        .font(.headline)
                    
                    HStack {
                        Text(c)
                            .font(.system(size: 32, weight: .bold, design: .monospaced))
                            .tracking(4)
                            .padding()
                            .background(Color.orange.opacity(0.1))
                            .cornerRadius(8)
                        
                        Button {
                            UIPasteboard.general.string = c
                            showCopiedToast = true
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                showCopiedToast = false
                            }
                        } label: {
                            Image(systemName: "doc.on.doc")
                                .font(.title3)
                                .foregroundColor(.blue)
                        }
                        .buttonStyle(BorderlessButtonStyle())
                    }
                    
                    Text("分享此码给学生加入班级")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                } else if isLoading {
                    ProgressView("生成中...")
                } else if let err = errorMsg {
                    Text(errorMessage(err))
                        .foregroundColor(.red)
                }
                
                Spacer()
                
                Button("更换邀请码（撤销旧码）") {
                    rotate()
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading)
            }
            .padding()
            .navigationTitle("邀请码")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") { dismiss() }
                }
            }
            .overlay {
                if showCopiedToast {
                    Text("已复制到剪贴板")
                        .font(.caption)
                        .padding(8)
                        .background(Color.black.opacity(0.7))
                        .foregroundColor(.white)
                        .cornerRadius(8)
                        .transition(.move(edge: .top).combined(with: .opacity))
                        .animation(.easeInOut, value: showCopiedToast)
                }
            }
            .task {
                rotate()
            }
        }
    }
    
    func rotate() {
        isLoading = true
        errorMsg = nil
        Task {
            do {
                let invite = try await api.generateInvite(classId: classId)
                await MainActor.run {
                    code = invite.code
                    isLoading = false
                    onRotate()
                }
            } catch {
                await MainActor.run {
                    errorMsg = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
    
    private func errorMessage(_ msg: String) -> String {
        if msg.contains("403") || msg.contains("forbidden") {
            return "无权限：请使用教师账号登录"
        }
        if msg.contains("network") || msg.contains("Network") {
            return "网络异常，请重试"
        }
        return "操作失败：\(msg)"
    }
}
