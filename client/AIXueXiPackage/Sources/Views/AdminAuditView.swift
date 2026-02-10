import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

struct AdminAuditView: View {
    @ObservedObject var api = APIService.shared
    @Environment(\.dismiss) var dismiss
    @State private var logs: [AuditLog] = []
    @State private var isLoading = false
    @State private var isLoadingMore = false
    @State private var errorMsg: String?
    
    // State for role switcher (Dev only)
    @State private var currentRole: String = "admin"
    
    // Filters
    @State private var selectedClassId: String = ""
    @State private var selectedAction: String = ""
    @State private var selectedRole: String = ""
    @State private var fromDate: Date = Date().addingTimeInterval(-86400) // 24h ago
    @State private var toDate: Date = Date()
    
    // Export state
    @State private var isExporting = false
    @State private var exportMessage: String?
    @State private var showExportAlert = false
    
    // Pagination
    @State private var offset: Int = 0
    @State private var limit: Int = 20
    @State private var total: Int = 0
    @State private var hasMore: Bool = true
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Role Switcher (Dev Tool)
                HStack {
                    Text("模拟身份:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Picker("Role", selection: $currentRole) {
                        Text("Admin").tag("admin")
                        Text("Teacher").tag("teacher")
                        Text("Student").tag("student")
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .onChange(of: currentRole) { newValue in
                        api.currentUserId = "dev_\(newValue)_test"
                    }
                }
                .padding()
                
                // Filter Bar
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        // Class Filter
                        Menu {
                            Button("全部班级") { selectedClassId = ""; load(reset: true) }
                            Divider()
                            // In real app, would fetch class list
                            Button("Class A") { selectedClassId = "class_a"; load(reset: true) }
                            Button("Class B") { selectedClassId = "class_b"; load(reset: true) }
                        } label: {
                            Text(selectedClassId.isEmpty ? "全部班级" : selectedClassId)
                                .font(.subheadline)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                            .background(platformGray6)
                            .cornerRadius(8)
                        }
                        
                        // Action Filter
                        Menu {
                            Button("全部操作") { selectedAction = ""; load(reset: true) }
                            Divider()
                            Button("创建班级") { selectedAction = "CREATE_CLASS"; load(reset: true) }
                            Button("加入班级") { selectedAction = "JOIN_CLASS"; load(reset: true) }
                            Button("退出班级") { selectedAction = "LEAVE_CLASS"; load(reset: true) }
                            Button("移除学生") { selectedAction = "KICK_MEMBER"; load(reset: true) }
                        } label: {
                            Text(selectedAction.isEmpty ? "全部操作" : actionDisplayName(selectedAction))
                                .font(.subheadline)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                            .background(platformGray6)
                            .cornerRadius(8)
                        }
                        
                        // Date Range
                        DatePicker("从", selection: $fromDate, displayedComponents: .date)
                            .labelsHidden()
                            .scaleEffect(0.9)
                        
                        DatePicker("至", selection: $toDate, displayedComponents: .date)
                            .labelsHidden()
                            .scaleEffect(0.9)
                        
                        Button {
                            load(reset: true)
                        } label: {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }
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
                            Text("暂无操作记录")
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
                                            Text(log.actor_role == "teacher" ? "教师" : (log.actor_role == "student" ? "学生" : log.actor_role))
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                        if !selectedClassId.isEmpty == false {
                                            Text(shortTarget(log.target))
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
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
            .navigationTitle("全局审计 (Admin)")
            #if canImport(UIKit)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                #if canImport(UIKit)
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        exportCSV()
                    } label: {
                        if isExporting {
                            ProgressView()
                        } else {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                    .disabled(isExporting)
                }
                #else
                ToolbarItem(placement: .automatic) {
                    Button {
                        exportCSV()
                    } label: {
                        if isExporting {
                            ProgressView()
                        } else {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                    .disabled(isExporting)
                }
                #endif
                ToolbarItem(placement: .cancellationAction) {
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
                let result = try await api.getAdminAuditLogs(
                    classId: selectedClassId.isEmpty ? nil : selectedClassId,
                    action: selectedAction.isEmpty ? nil : selectedAction,
                    actorRole: selectedRole.isEmpty ? nil : selectedRole,
                    from: Int(fromDate.timeIntervalSince1970 * 1000),
                    to: Int(toDate.timeIntervalSince1970 * 1000),
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
                let result = try await api.getAdminAuditLogs(
                    classId: selectedClassId.isEmpty ? nil : selectedClassId,
                    action: selectedAction.isEmpty ? nil : selectedAction,
                    actorRole: selectedRole.isEmpty ? nil : selectedRole,
                    from: Int(fromDate.timeIntervalSince1970 * 1000),
                    to: Int(toDate.timeIntervalSince1970 * 1000),
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
                let csv = try await api.exportAdminAuditLogs(
                    classId: selectedClassId.isEmpty ? nil : selectedClassId,
                    action: selectedAction.isEmpty ? nil : selectedAction,
                    actorRole: selectedRole.isEmpty ? nil : selectedRole,
                    from: Int(fromDate.timeIntervalSince1970 * 1000),
                    to: Int(toDate.timeIntervalSince1970 * 1000),
                    mode: "page"
                )
                await MainActor.run {
                    copyToPasteboard(csv)
                    exportMessage = "已复制到剪贴板"
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
        if target.count > 30 {
            return String(target.prefix(30)) + "..."
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
