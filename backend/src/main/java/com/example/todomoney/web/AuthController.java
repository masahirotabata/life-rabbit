package com.example.todomoney.web;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.todomoney.entity.User;
import com.example.todomoney.repo.UserRepository;
import com.example.todomoney.security.JwtService;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@CrossOrigin(
    origins = {
        "https://liferabbit-todo-web.onrender.com", // 本番フロント
        "http://localhost:5173",                    // ローカル開発
        "http://127.0.0.1:5173"
    },
    allowedHeaders = { "Authorization", "Content-Type", "X-Requested-With" },
    methods = {
        RequestMethod.GET,
        RequestMethod.POST,
        RequestMethod.PUT,
        RequestMethod.DELETE,
        RequestMethod.OPTIONS
    },
    allowCredentials = "true"
)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final UserRepository userRepo;
  private final PasswordEncoder encoder;
  private final JwtService jwt;

  public AuthController(UserRepository userRepo, PasswordEncoder encoder, JwtService jwt) {
    this.userRepo = userRepo;
    this.encoder = encoder;
    this.jwt = jwt;
  }

  public record RegisterRequest(@Email @NotBlank String email, @NotBlank String password) {}
  public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
  public record AuthResponse(String token) {}

  @PostMapping("/register")
  public AuthResponse register(@RequestBody RegisterRequest req) {
    if (userRepo.findByEmail(req.email()).isPresent()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "email already exists");
    }
    User u = new User();
    u.setEmail(req.email().toLowerCase());
    u.setPasswordHash(encoder.encode(req.password()));
    u = userRepo.save(u);
    return new AuthResponse(jwt.issueToken(u.getId(), u.getEmail()));
  }

  @PostMapping("/login")
  public AuthResponse login(@RequestBody LoginRequest req) {
    var u = userRepo.findByEmail(req.email().toLowerCase())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials"));
    if (!encoder.matches(req.password(), u.getPasswordHash())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
    }
    return new AuthResponse(jwt.issueToken(u.getId(), u.getEmail()));
  }
}
