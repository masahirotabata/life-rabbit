package com.example.todomoney.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name="task_schedules")
public class TaskSchedule {
    public enum Type { DATE, RANGE, WEEKLY }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="user_id", nullable=false)
    private Long userId;

    @ManyToOne(optional=false, fetch=FetchType.LAZY)
    @JoinColumn(name="task_id", nullable=false)
    private Task task;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false, length=10)
    private Type type;

    // DATEのとき
    private LocalDate date;

    // RANGE / WEEKLY のとき
    @Column(name="start_date")
    private LocalDate startDate;

    @Column(name="end_date")
    private LocalDate endDate;

    // WEEKLYのとき
    @Column(name="dow_mask")
    private Integer daysOfWeekMask; // null可

    // --- getters/setters ---
    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }
    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public Integer getDaysOfWeekMask() { return daysOfWeekMask; }
    public void setDaysOfWeekMask(Integer daysOfWeekMask) { this.daysOfWeekMask = daysOfWeekMask; }
}
