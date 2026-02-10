import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

struct AuditLogView: View {
    @ObservedObject var api: APIService = .shared
    let classId: String
    @Environment(\.dismiss) var dismiss
    @State private var logs: [AuditLog] = []
    @State private var isLoading = false
    @State private var isLoadingMore = false
    @State private var errorMsg: String?
    
    // Export state
    @State private var isExporting = false
    @State private var exportMessage: String?
    @State private var showExportAlert = false
    
    // Filters
    @State private var selectedAction: String = ""
    @State private var selectedRole: String = ""
    
    // Pagination
    @State private var offset: Int = 0
    @State private var limit: Int = 20
    @State private var total: Int = 0
    @State private var hasMore: Bool = true
    
    var exportFilename: String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyyMMdd-HHmm"
        let dateStr = dateFormatter.string(from: Date())
        return "audit_\(classId.prefix(8))_\(dateStr).csv"
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filter Bar
                HStack {
                    Menu {
                        Button("全部操作") { selectedAction = ""; load(reset: true) }
                        Divider()
                        Button("创建班级") { selectedAction = "CREATE_CLASS"; load(reset: true) }
                        Button("更换邀请码") { selectedAction = "ROTATE_INVITE"; load(reset: true) }
                        Button("加入班级") { selectedAction = "JOIN_CLASS"; load(reset: true) }
                        Button("移除学生") { selectedAction = "KICK_MEMBER"; load(reset: true) }
                        Button("退出班级") { selectedAction = "LEAVE_CLASS"; load(reset: true) }
                    } label: {
                        Text(selectedAction.isEmpty ? "全部操作" : actionDisplayName(selectedAction))
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(platformGray6)
                            .cornerRadius(8)
                    }
                    
                    Menu {
                        Button("全部角色") { selectedRole = ""; load(reset: true) }
                        Divider()
                        Button("教师") { selectedRole = "teacher"; load(reset: true) }
                        Button("学生") { selectedRole = "student"; load(reset: true) }
                    } label: {
                        Text(selectedRole.isEmpty ? "全部角色" : (selectedRole == "teacher" ? "教师" : "学生"))
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(platformGray6)
                            .cornerRadius(8)
                    }
                    
                    Spacer()
                    
                    // Export Button with loading state
                    Button {
                        exportCSV()
                    } label: {
                        if isExporting {
                            ProgressView()
                                .frame(width: 20, height: 20)
                        } else {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                    .disabled(isExporting)
                }
                .padding()
                .background(platformBackground)
                
                Divider()
                
                // Content
                Group {
                    if isLoading {
                        ProgressView("加载中...")
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if let err = errorMsg {
                        VStack(spacing: 20) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.system(size: 50))
                                .foregroundColor(.red)
                            Text("加载失败")
                                .font(.headline)
                            Text(err)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            Button("重试") { load(reset: true) }
                        }
                        .padding()
                    } else if logs.isEmpty {
                        VStack(spacing: 20) {
                            Image(systemName: "list.bullet.clipboard")
                                .font(.system(size: 60))
                                .foregroundColor(.secondary)
                            Text("暂无符合条件的记录")
                                .font(.title3)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        List {
                            ForEach(logs) { log in
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(actionDisplayName(log.action))
                                            .font(.headline)
                                        HStack {
                                            Text(log.actor_id)
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                            Text("·")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                            Text(log.actor_role == "teacher" ? "教师" : "学生")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                        Text(shortTarget(log.target))
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing, spacing: 4) {
                                        Text(formatDate(log.timestamp))
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                        Text(log.result.uppercased())
                                            .font(.caption2)
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
                            
                            if hasMore {
                                Button("加载更多") {
                                    loadMore()
                                }
                                .frame(maxWidth: .infinity)
                                .disabled(isLoadingMore)
                            }
                        }
                        .listStyle(PlainListStyle())
                    }
                }
            }
            .navigationTitle("审计记录")
            #if canImport(UIKit)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") { dismiss() }
                }
            }
            .task { load(reset: true) }
            .alert("导出结果", isPresented: $showExportAlert) {
                Button("确定") {}
            } message: {
                Text(exportMessage ?? "")
            }
        }
    }
    
    func load(reset: Bool = false) {
        if reset {
            offset = 0
            logs = []
            hasMore = true
        }
        
        isLoading = true
        errorMsg = nil
        
        Task {
            do {
                let result = try await api.getAuditLogsPaginated(
                    classId: classId,
                    action: selectedAction.isEmpty ? nil : selectedAction,
                    actorRole: selectedRole.isEmpty ? nil : selectedRole,
                    offset: offset,
                    limit: limit
                )
                await MainActor.run {
                    if reset {
                        logs = result.items
                    } else {
                        logs.append(contentsOf: result.items)
                    }
                    total = result.total
                    hasMore = logs.count < result.total
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
    
    func loadMore() {
        guard !isLoadingMore else { return }
        offset += limit
        isLoadingMore = true
        
        Task {
            do {
                let result = try await api.getAuditLogsPaginated(
                    classId: classId,
                    action: selectedAction.isEmpty ? nil : selectedAction,
                    actorRole: selectedRole.isEmpty ? nil : selectedRole,
                    offset: offset,
                    limit: limit
                )
                await MainActor.run {
                    logs.append(contentsOf: result.items)
                    hasMore = logs.count < result.total
                    isLoadingMore = false
                }
            } catch {
                await MainActor.run {
                    isLoadingMore = false
                }
            }
        }
    }
    
    func exportCSV() {
        isExporting = true
        exportMessage = nil
        
        Task {
            do {
                let csv = try await api.exportAuditLogs(
                    classId: classId,
                    action: selectedAction.isEmpty ? nil : selectedAction,
                    actorRole: selectedRole.isEmpty ? nil : selectedRole
                )
                await MainActor.run {
                    // Copy to clipboard for demo (real app would use ShareSheet)
                    copyToPasteboard(csv)
                    exportMessage = "已复制到剪贴板：\(exportFilename)"
                    isExporting = false
                    showExportAlert = true
                }
            } catch {
                await MainActor.run {
                    exportMessage = "导出失败：\(error.localizedDescription)"
                    isExporting = false
                    showExportAlert = true
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
        if target.count > 25 {
            return String(target.prefix(25)) + "..."
        }
        return target
    }
    
    private var platformGray6: Color {
        #if canImport(UIKit)
        return Color(uiColor: .systemGray6)
        #elseif canImport(AppKit)
        return Color(nsColor: .windowBackgroundColor)
        #else
        return Color.gray.opacity(0.2)
        #endif
    }
    
    private var platformBackground: Color {
        #if canImport(UIKit)
        return Color(uiColor: .systemBackground)
        #elseif canImport(AppKit)
        return Color(nsColor: .windowBackgroundColor)
        #else
        return Color.white
        #endif
    }
    
    private func copyToPasteboard(_ text: String) {
        #if canImport(UIKit)
        UIPasteboard.general.string = text
        #elseif canImport(AppKit)
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
        #endif
    }
}
