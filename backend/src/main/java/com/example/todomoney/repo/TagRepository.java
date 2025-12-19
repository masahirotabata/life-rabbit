package com.example.todomoney.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.todomoney.entity.Tag;

public interface TagRepository extends JpaRepository<Tag, Long> {
  List<Tag> findByUserIdOrderByNameAsc(Long userId);
  Optional<Tag> findByIdAndUserId(Long id, Long userId);
}
