package com.example.todomoney.web;

import java.time.LocalDate;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.todomoney.entity.Task;
import com.example.todomoney.entity.TaskCompletionLog;
import com.example.todomoney.repo.TaskCompletionLogRepository;
import com.example.todomoney.repo.TaskRepository;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/complete")
public class CompletionController {

    private final TaskRepository tasks;
    private final TaskCompletionLogRepository logs;

    public CompletionController(TaskRepository tasks, TaskCompletionLogRepository logs) {
        this.tasks = tasks;
        this.logs = logs;
    }

    public static class CompleteReq {
        public Long taskId;
        public String date; // yyyy-MM-dd
    }

    @PostMapping
    public void complete(@RequestBody CompleteReq body, HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        LocalDate d = LocalDate.parse(body.date);

        Task task = tasks.findByIdAndUserId(body.taskId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (logs.existsByUserIdAndTask_IdAndOccurrenceDate(userId, task.getId(), d)) {
            return; // 二重登録防止（最小）
        }

        TaskCompletionLog log = new TaskCompletionLog();
        log.setUserId(userId);
        log.setTask(task);
        log.setOccurrenceDate(d);
        logs.save(log);
    }
}
