// =============================
// LectureMind AI Frontend Logic
// =============================
class LectureMindApp {
    constructor() {
        this.currentLecture = null;
        this.currentSection = "detailed";
        this.processingInterval = null;
        this.init();
    }

    // Initialize based on page type
    init() {
        if (document.getElementById("videoUrl")) {
            this.initHomePage();
        }
        if (window.lectureData) {
            this.currentLecture = window.lectureData;
            this.initNotesPage();
        }
    }

    // ============================
    // HOME PAGE LOGIC
    // ============================
    initHomePage() {
        const processBtn = document.querySelector(".btn-primary");
        const videoInput = document.getElementById("videoUrl");

        if (processBtn) {
            processBtn.addEventListener("click", () => this.processVideo());
        }
        if (videoInput) {
            videoInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.processVideo();
            });
        }
    }

    async processVideo() {
        const videoUrl = document.getElementById("videoUrl")?.value?.trim();
        const processBtn = document.querySelector(".btn-primary");

        if (!videoUrl) {
            this.showAlert("Please paste a video URL first!", "error");
            return;
        }

        // Basic URL validation
        if (!this.isValidYouTubeUrl(videoUrl) && !this.isValidUrl(videoUrl)) {
            this.showAlert("Please enter a valid YouTube URL!", "error");
            return;
        }

        processBtn.disabled = true;
        processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        this.showProcessingModal();

        try {
            const response = await fetch("/process", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ url: videoUrl })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                document.getElementById("progress").style.width = "100%";
                document.getElementById("statusMessage").textContent = "✓ Processing complete! Redirecting...";
                document.getElementById("statusMessage").style.color = "#10b981";

                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 1200);
            } else {
                this.showAlert(data.error || "Processing failed!", "error");
                this.hideProcessingModal();
                processBtn.disabled = false;
                processBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Notes';
            }

        } catch (error) {
            console.error("Process error:", error);
            this.showAlert("Network error! Please check your connection and try again.", "error");
            this.hideProcessingModal();
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Notes';
        }
    }

    isValidYouTubeUrl(url) {
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/
        ];
        return patterns.some(pattern => pattern.test(url));
    }

    // ============================
    // PROCESSING MODAL
    // ============================
    showProcessingModal() {
        const modal = document.getElementById("processingModal");
        if (modal) {
            modal.style.display = "flex";
            document.getElementById("progress").style.width = "0%";
            this.simulateProcessing();
        }
    }

    simulateProcessing() {
        const steps = document.querySelectorAll(".step");
        const progressBar = document.getElementById("progress");
        const statusMessage = document.getElementById("statusMessage");

        const messages = [
            "Extracting video information...",
            "Fetching transcript...",
            "Analyzing content with AI...",
            "Identifying key concepts...",
            "Generating study materials...",
            "Finalizing notes..."
        ];

        let step = 0;
        let progress = 0;

        steps.forEach((s) => s.classList.remove("active"));

        this.processingInterval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress > 100) progress = 100;

            if (progressBar) progressBar.style.width = progress + "%";

            if (step < steps.length && steps[step]) {
                steps[step].classList.add("active");
            }

            if (statusMessage && messages[step]) {
                statusMessage.textContent = messages[step];
            }

            step++;

            if (progress >= 100) {
                clearInterval(this.processingInterval);
            }

        }, 800);
    }

    hideProcessingModal() {
        const modal = document.getElementById("processingModal");
        if (modal) modal.style.display = "none";
        clearInterval(this.processingInterval);
    }

    // ============================
    // NOTES PAGE LOGIC
    // ============================
    initNotesPage() {
        this.renderNotes();
        this.setupSectionSwitching();
        this.setupExport();
        this.setupMCQs();

        // Check for hash in URL
        const urlHash = window.location.hash.substring(1);
        if (urlHash && ["detailed", "revision", "doubt", "questions", "toolkit"].includes(urlHash)) {
            this.showSection(urlHash);
            this.updateActiveButton(urlHash);
        }
    }

    setupSectionSwitching() {
        const buttons = document.querySelectorAll(".tool-btn[data-section]");

        buttons.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const section = btn.dataset.section;
                if (section) {
                    this.showSection(section);
                    this.updateActiveButton(section);
                }
            });
        });
    }

    updateActiveButton(sectionId) {
        const buttons = document.querySelectorAll(".tool-btn[data-section]");
        buttons.forEach((b) => b.classList.remove("active"));
        
        const activeBtn = document.querySelector(`.tool-btn[data-section="${sectionId}"]`);
        if (activeBtn) activeBtn.classList.add("active");
    }

    showSection(sectionId) {
        const sections = ["detailed", "revision", "doubt", "questions", "toolkit"];

        sections.forEach((sec) => {
            const el = document.getElementById(sec + "Section");
            if (el) el.classList.add("hidden");
        });

        const selected = document.getElementById(sectionId + "Section");
        if (selected) {
            selected.classList.remove("hidden");
            window.location.hash = sectionId;
        }
    }

    // ============================
    // RENDER CONTENT
    // ============================
    renderNotes() {
        if (!this.currentLecture) {
            console.error("No lecture data available");
            return;
        }

        this.renderDetailedNotes();
        this.renderRevisionNotes();
        this.renderDoubtPoints();
        this.renderKeyConcepts();
        this.renderQuestions();
        this.renderMCQs();
    }

    renderDetailedNotes() {
        const container = document.getElementById("detailedNotes");
        if (!container) return;

        const notes = this.currentLecture.analysis?.detailed_notes || "No detailed notes available.";
        
        container.innerHTML = `
            <div class="section-heading">
                <i class="fas fa-file-alt"></i>
                <h2>Detailed Notes</h2>
            </div>
            <div style="white-space: pre-wrap; line-height: 1.6; padding: 10px;">
                ${notes.replace(/\n/g, '<br>')}
            </div>
        `;
    }

    renderRevisionNotes() {
        const container = document.getElementById("revisionNotes");
        if (!container) return;

        const notes = this.currentLecture.analysis?.revision_notes || "No revision notes available.";
        
        const formatted = notes.split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => `<div class="revision-point">${line}</div>`)
            .join("");

        container.innerHTML = `
            <div class="section-heading">
                <i class="fas fa-bolt"></i>
                <h2>Revision Notes</h2>
            </div>
            ${formatted || '<p>No revision notes available.</p>'}
        `;
    }

    renderDoubtPoints() {
        const doubts = this.currentLecture.analysis?.doubt_points || [];
        const list = document.getElementById("doubtList");
        const main = document.getElementById("doubtPointsContent");

        if (list) {
            if (doubts.length === 0) {
                list.innerHTML = '<li style="color: var(--text-light); padding: 10px;">No doubt points identified.</li>';
            } else {
                list.innerHTML = doubts.map((d, i) => `
                    <li class="doubt-item" onclick="app.scrollToDoubt(${i})" style="cursor: pointer; padding: 8px; margin-bottom: 5px; border-radius: 6px; background: white; border-left: 3px solid #ef4444;">
                        <strong>${d.timestamp} - ${d.concept}</strong><br>
                        <span style="font-size:0.85rem;color:var(--text-light);">${d.confidence || 70}% students confused</span>
                    </li>
                `).join("");
            }
        }

        if (main) {
            if (doubts.length === 0) {
                main.innerHTML = '<p>No confusion points were identified in this lecture.</p>';
            } else {
                main.innerHTML = doubts.map((d, i) => `
                    <div id="doubt-${i}" class="doubt-highlight">
                        <strong>⚠️ ${d.timestamp || "Unknown time"} — ${d.concept || "Unknown concept"}</strong>
                        <p style="margin: 10px 0;">${d.explanation || "No explanation available."}</p>
                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                            <span style="background: #fef3c7; padding: 4px 8px; border-radius: 12px; font-size: 0.85rem;">
                                ${d.confidence || 70}% of students find this confusing
                            </span>
                            <button onclick="app.showAIExplanation(${i})" class="btn btn-primary">
                                <i class="fas fa-robot"></i> AI Explanation
                            </button>
                        </div>
                    </div>
                `).join("");
            }
        }
    }

    renderKeyConcepts() {
        const concepts = this.currentLecture.analysis?.key_concepts || [];
        const list = document.getElementById("conceptList");

        if (list) {
            if (concepts.length === 0) {
                list.innerHTML = '<li style="color: var(--text-light); padding: 10px;">No key concepts identified.</li>';
            } else {
                list.innerHTML = concepts.map((c, i) => `
                    <li class="concept-item" onclick="app.scrollToConcept(${i})" style="cursor: pointer; padding: 10px; margin-bottom: 5px; border-radius: 6px; background: white; border-left: 3px solid #667eea;">
                        ${c}
                    </li>
                `).join("");
            }
        }
    }

    renderQuestions() {
        const questions = this.currentLecture.analysis?.important_questions || [];
        const container = document.getElementById("questionsContent");

        if (container) {
            if (questions.length === 0) {
                container.innerHTML = '<p>No questions generated for this lecture.</p>';
            } else {
                container.innerHTML = questions.map((q, i) => `
                    <div class="ai-highlight">
                        <strong>Q${i + 1}:</strong> ${q}
                    </div>
                `).join("");
            }
        }
    }

    renderMCQs() {
        const container = document.getElementById("mcqSection");
        if (!container) return;

        const mcqs = this.currentLecture.mcqs && this.currentLecture.mcqs.mcqs 
    ? this.currentLecture.mcqs.mcqs 
    : [];


        if (mcqs.length === 0) {
            container.innerHTML = `
                <div class="section-heading">
                    <i class="fas fa-question-circle"></i>
                    <h2>Practice MCQs</h2>
                </div>
                <p>No practice questions available for this lecture.</p>
            `;
            return;
        }

        container.innerHTML = `
            <div class="section-heading">
                <i class="fas fa-question-circle"></i>
                <h2>Practice MCQs (${mcqs.length} questions)</h2>
            </div>
            <div class="mcq-grid">
                ${mcqs.map((mcq, i) => `
                    <div class="mcq-card">
                        <h3>Q${i + 1}: ${mcq.question || "No question text"}</h3>
                        <div class="mcq-options">
                            ${(mcq.options || []).map((op, idx) => {
                                const letter = String.fromCharCode(65 + idx);
                                return `
                                    <div class="mcq-option" 
                                         data-letter="${letter}"
                                         data-correct="${mcq.correct || 'A'}"
                                         data-question="${i}">
                                        ${op || `Option ${letter}`}
                                    </div>`;
                            }).join("")}
                        </div>
                        <div class="mcq-explanation hidden" style="margin-top: 15px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
                            <strong style="color: #10b981;">Explanation:</strong> 
                            <p style="margin-top: 5px;">${mcq.explanation || "No explanation available."}</p>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    // ============================
    // INTERACTION FUNCTIONS
    // ============================
    scrollToDoubt(i) {
        const el = document.getElementById(`doubt-${i}`);
        if (el) {
            this.showSection("doubt");
            setTimeout(() => {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.style.animation = "pulse 2s";
                setTimeout(() => (el.style.animation = ""), 2000);
            }, 100);
        }
    }

    scrollToConcept(i) {
        const concepts = this.currentLecture.analysis?.key_concepts || [];
        if (concepts[i]) {
            this.showAlert(`Concept: ${concepts[i]}`, "info");
        }
    }

    showAIExplanation(i) {
        const doubt = this.currentLecture.analysis?.doubt_points?.[i];
        if (!doubt) return;

        const content = `
            <div style="padding: 20px;">
                <h3 style="color: #764ba2; margin-bottom: 15px;">${doubt.concept || "Concept"}</h3>
                <p style="margin-bottom: 15px; line-height: 1.6;">${doubt.explanation || "No explanation available."}</p>
                <div style="background: #f0f9ff; padding: 15px; border-radius: 10px; margin-top: 20px;">
                    <strong style="color: #0369a1;">🤖 AI Learning Tip:</strong>
                    <p style="margin-top: 10px;">Try breaking this concept down into smaller parts. Review related examples and practice applying the concept in different scenarios. Consider creating flashcards for this topic.</p>
                </div>
            </div>
        `;

        this.showModal("AI Tutor Explanation", content);
    }

    // ============================
    // EXPORT NOTES
    // ============================
    setupExport() {
        const btn = document.getElementById("exportBtn");
        if (btn) {
            btn.addEventListener("click", () => this.exportNotes());
        }
    }

    async exportNotes() {
        if (!this.currentLecture?.id) {
            this.showAlert("No lecture data available to export.", "error");
            return;
        }

        try {
            const response = await fetch(`/export/${this.currentLecture.id}`);
            if (!response.ok) {
                throw new Error("Export failed");
            }
            
            const data = await response.json();
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `lecturemind-${this.currentLecture.id.slice(0, 8)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showAlert("Notes exported successfully!", "success");
        } catch (error) {
            console.error("Export error:", error);
            this.showAlert("Failed to export notes.", "error");
        }
    }

    // ============================
    // MCQ CHECKING
    // ============================
    setupMCQs() {
        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("mcq-option")) {
                this.checkMCQAnswer(e.target);
            }
        });
    }

    checkMCQAnswer(el) {
        const selected = el.dataset.letter;
        const correct = el.dataset.correct;
        const questionIndex = el.dataset.question;

        const card = el.closest(".mcq-card");
        const options = card.querySelectorAll(".mcq-option");
        const explanation = card.querySelector(".mcq-explanation");

        // Remove previous styling
        options.forEach((o) => {
            o.classList.remove("correct", "incorrect");
            o.style.pointerEvents = "none";
        });

        // Mark correct answer
        options.forEach((o) => {
            if (o.dataset.letter === correct) {
                o.classList.add("correct");
            }
        });

        // Mark selected answer
        if (selected === correct) {
            el.classList.add("correct");
            this.showAlert("Correct! 🎯", "success");
        } else {
            el.classList.add("incorrect");
            this.showAlert(`Correct answer is ${correct}`, "error");
        }

        // Show explanation
        if (explanation) {
            explanation.classList.remove("hidden");
        }
    }

    // ============================
    // UTILITY FUNCTIONS
    // ============================
    isValidUrl(str) {
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    }

    showAlert(message, type = "info") {
        // Remove existing alerts
        const existing = document.querySelector(".alert-toast");
        if (existing) existing.remove();

        // Create new alert
        const alert = document.createElement("div");
        alert.className = "alert-toast";
        
        const colors = {
            success: { bg: "#d1fae5", text: "#065f46", icon: "fa-check-circle" },
            error: { bg: "#fee2e2", text: "#b91c1c", icon: "fa-exclamation-circle" },
            info: { bg: "#e0f2fe", text: "#1e40af", icon: "fa-info-circle" }
        };
        
        const style = colors[type] || colors.info;
        
        alert.innerHTML = `
            <div style="
                position: fixed;
                top: 100px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 10px;
                z-index: 9999;
                background: ${style.bg};
                color: ${style.text};
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 300px;
                max-width: 400px;
                animation: slideIn 0.3s ease;
            ">
                <i class="fas ${style.icon}" style="font-size: 1.2rem;"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(alert);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.animation = "slideOut 0.3s ease";
                setTimeout(() => alert.remove(), 300);
            }
        }, 3000);
    }

    showModal(title, content) {
        const modal = document.getElementById("aiModal");
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-content" style="max-width:600px; width: 90%;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                    <h2 style="margin: 0;">${title}</h2>
                    <button onclick="app.closeModal()" 
                            style="background:none; border:none; font-size:1.5rem; cursor:pointer; color: var(--text-light);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="max-height: 60vh; overflow-y: auto; padding-right: 10px;">
                    ${content}
                </div>
                <div class="text-center mt-4">
                    <button onclick="app.closeModal()" class="btn btn-primary">
                        Got it!
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove("hidden");
        modal.style.display = "flex";
    }

    closeModal() {
        const modal = document.getElementById("aiModal");
        if (modal) {
            modal.style.display = "none";
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.app = new LectureMindApp();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); }
        100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
    }
`;
document.head.appendChild(style);