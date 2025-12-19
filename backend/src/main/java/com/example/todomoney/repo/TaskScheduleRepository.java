package com.example.todomoney.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.todomoney.entity.TaskSchedule;

public interface TaskScheduleRepository extends JpaRepository<TaskSchedule, Long> {

    // TaskSchedule -> task -> userId で絞り込む
    List<TaskSchedule> findByTask_UserId(Long userId);
    List<TaskSchedule> findByUserId(Long userId);
    List<TaskSchedule> findByTask_UserIdAndTask_Id(Long userId, Long taskId);
}
