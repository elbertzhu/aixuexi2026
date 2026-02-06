import SwiftUI

struct AuditLogView: View {
    @ObservedObject var api: APIService.shared
    let classId: String
    @Environment(\.dismiss) var dismiss
    @State private var logs: [AuditLog] = []
    @State private var isLoading = false
    @State private var errorMsg: String?
    
    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView("加载中...")
                } else if let err = errorMsg {
                    VStack(spacing: 20) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 50))
                            .foregroundColor(.red)
                        Text("加载失败")
                            .font(.headline)
                        Text(err)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        Button("重试") { load() }
                    }
                    .padding()
                } else if logs.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "list.bullet.clipboard")
                            .font(.system(size: 60))
                            .foregroundColor(.secondary)
                        Text("暂无操作记录")
                            .font(.title2)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(logs) { log in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(actionDisplayName(log.action))
                                    .font(.headline)
                                Text("用户：\(log.actor_id)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Text("目标：\(shortTarget(log.target))")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 4) {
                                Text(formatDate(log.timestamp))
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Text(log.result.uppercased())
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(log.result == "success" ? Color.green.opacity(0.2) : Color.red.opacity(0.2))
                                    .foregroundColor(log.result == "success" ? .green : .red)
                                    .cornerRadius(4)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listStyle(PlainListStyle())
                }
            }
            .navigationTitle("审计记录")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") { dismiss() }
                }
            }
            .task { load() }
        }
    }
    
    func load() {
        isLoading = true
        errorMsg = nil
        Task {
            do {
                let data = try await api.getAuditLogs(classId: classId)
                await MainActor.run {
                    logs = data
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMsg = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
    
    private func formatDate(_ ts: Int) -> String {
        let date = Date(timeIntervalSince1970: Double(ts) / 1000)
        let formatter = DateFormatter()
        formatter.dateFormat = "MM/dd HH:mm:ss"
        return formatter.string(from: date)
    }
    
    private func actionDisplayName(_ action: String) -> String {
        switch action {
        case "CREATE_CLASS": return "创建班级"
        case "ROTATE_INVITE": return "更换邀请码"
        case "JOIN_CLASS": return "加入班级"
        case "KICK_MEMBER": return "移除学生"
        case "LEAVE_CLASS": return "退出班级"
        default: return action
        }
    }
    
    private func shortTarget(_ target: String) -> String {
        if target.count > 20 {
            return String(target.prefix(20)) + "..."
        }
        return target
    }
}
