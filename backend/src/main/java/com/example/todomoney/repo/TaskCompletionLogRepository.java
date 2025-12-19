package com.example.todomoney.repo;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.todomoney.entity.TaskCompletionLog;

public interface TaskCompletionLogRepository extends JpaRepository<TaskCompletionLog, Long> {
  List<TaskCompletionLog> findByUserIdAndOccurrenceDateBetweenOrderByCompletedAtDesc(
      Long userId, LocalDate from, LocalDate to
  );

  boolean existsByUserIdAndTask_IdAndOccurrenceDate(Long userId, Long taskId, LocalDate date);
}
