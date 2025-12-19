package com.example.todomoney.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name="task_completion_logs", indexes = {
        @Index(name="idx_log_user_date", columnList="user_id,occurrence_date")
})
public class TaskCompletionLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="user_id", nullable=false)
    private Long userId;

    @ManyToOne(optional=false, fetch=FetchType.LAZY)
    @JoinColumn(name="task_id", nullable=false)
    private Task task;

    // 「どの日付のタスクを完了したか」：カレンダー表示と一致させる
    @Column(name="occurrence_date", nullable=false)
    private LocalDate occurrenceDate;

    @Column(name="completed_at", nullable=false)
    private Instant completedAt = Instant.now();

    // --- getters/setters ---
    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }
    public LocalDate getOccurrenceDate() { return occurrenceDate; }
    public void setOccurrenceDate(LocalDate occurrenceDate) { this.occurrenceDate = occurrenceDate; }
    public Instant getCompletedAt() { return completedAt; }
}
