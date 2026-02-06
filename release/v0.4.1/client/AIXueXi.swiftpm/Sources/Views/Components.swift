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
                Section("Class Name") {
                    TextField("e.g. Physics 101", text: $className)
                }
                
                if let err = errorMsg {
                    Section {
                        Text(err)
                            .foregroundColor(.red)
                    }
                }
                
                Section {
                    Button("Create") {
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
            .navigationTitle("New Class")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .interactiveDismissDisabled(isCreating)
        }
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
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                if let c = code {
                    Text("Active Invite Code")
                        .font(.headline)
                    
                    Text(c)
                        .font(.largeTitle)
                        .bold()
                        .tracking(2)
                        .padding()
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(8)
                    
                    Text("Share this code with students.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                } else if isLoading {
                    ProgressView("Generating...")
                } else if let err = errorMsg {
                    Text(err)
                        .foregroundColor(.red)
                }
                
                Spacer()
                
                Button("Rotate Code (Revoke Old)") {
                    rotate()
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading)
            }
            .padding()
            .navigationTitle("Invite")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task {
                // Initial load
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
}
