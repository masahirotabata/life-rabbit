package com.example.todomoney.web;

import java.time.LocalDate;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.todomoney.entity.Task;
import com.example.todomoney.entity.TaskSchedule;
import com.example.todomoney.repo.TaskRepository;
import com.example.todomoney.repo.TaskScheduleRepository;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {

    private final TaskRepository tasks;
    private final TaskScheduleRepository schedules;

    public ScheduleController(TaskRepository tasks, TaskScheduleRepository schedules) {
        this.tasks = tasks;
        this.schedules = schedules;
    }

    public static class UpsertScheduleReq {
        public Long taskId;
        public String type; // DATE / RANGE / WEEKLY
        public String date; // yyyy-MM-dd
        public String startDate;
        public String endDate;
        public Integer daysOfWeekMask; // WEEKLY
    }

    @PostMapping("/upsert")
    public TaskSchedule upsert(@RequestBody UpsertScheduleReq body, HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);

        Task task = tasks.findByIdAndUserId(body.taskId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        // 既存があれば1つだけ上書き（最小）
        TaskSchedule sch = schedules.findByTask_UserIdAndTask_Id(userId, task.getId()).stream().findFirst()
                .orElseGet(TaskSchedule::new);

        sch.setUserId(userId);
        sch.setTask(task);
        sch.setType(TaskSchedule.Type.valueOf(body.type));

        sch.setDate(body.date != null ? LocalDate.parse(body.date) : null);
        sch.setStartDate(body.startDate != null ? LocalDate.parse(body.startDate) : null);
        sch.setEndDate(body.endDate != null ? LocalDate.parse(body.endDate) : null);
        sch.setDaysOfWeekMask(body.daysOfWeekMask);

        return schedules.save(sch);
    }
}
