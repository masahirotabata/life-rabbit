package com.example.todomoney.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.todomoney.entity.Goal;
import com.example.todomoney.entity.Task;

public interface TaskRepository extends JpaRepository<Task, Long> {
    Optional<Task> findByIdAndUserId(Long id, Long userId);
    List<Task> findByUserIdAndGoalId(Long userId, Long goalId);
    List<Task> findByUserIdAndGoalIdIsNullAndArchivedFalse(Long userId);
	List<Task> findByGoalOrderByIdDesc(Goal goal);
	long countByGoal(Goal goal);
	long countByGoalAndCompletedTrue(Goal goal);

}