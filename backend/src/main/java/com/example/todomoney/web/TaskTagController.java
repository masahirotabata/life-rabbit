package com.example.todomoney.web;

import java.util.HashSet;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.todomoney.entity.Tag;
import com.example.todomoney.entity.Task;
import com.example.todomoney.repo.TagRepository;
import com.example.todomoney.repo.TaskRepository;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/tasks")
public class TaskTagController {

    private final TaskRepository tasks;
    private final TagRepository tags;

    public TaskTagController(TaskRepository tasks, TagRepository tags) {
        this.tasks = tasks;
        this.tags = tags;
    }

    public static class SetTagsReq {
        public List<Long> tagIds;
    }

    @PostMapping("/{taskId}/tags")
    public Task setTags(@PathVariable Long taskId, @RequestBody SetTagsReq body, HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);

        Task task = tasks.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        HashSet<Tag> newTags = new HashSet<>();
        if (body.tagIds != null) {
            for (Long tagId : body.tagIds) {
                Tag tag = tags.findByIdAndUserId(tagId, userId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid tagId"));
                newTags.add(tag);
            }
        }

        task.setTags(newTags);
        return tasks.save(task);
    }
}
