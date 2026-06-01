package com.example.cannondodge.ui.game

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.foundation.BorderStroke
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.math.roundToInt
import kotlin.math.sqrt
import kotlin.random.Random

// --- Game Colors ---
val DarkBackground = Color(0xFFF8FAFC) // Light/White slate-50 background
val NeonBlue = Color(0xFF0EA5E9)      // Rich Sky Blue (vibrant for light theme)
val NeonBlueGlow = Color(0xFF38BDF8)  // Light Sky Blue glow
val DarkBlue = Color(0xFFE2E8F0)      // Grid boundary
val CannonballDark = Color(0xFF334155)  // Slate-700
val CannonballHighlight = Color(0xFF64748B) // Slate-500
val ExplosionOrange = Color(0xFFFF6B35)
val ExplosionYellow = Color(0xFFFFD700)
val ScoreGold = Color(0xFFD97706)     // Amber 600 for contrast
val GameOverRed = Color(0xFFEF4444)   // Red 500
val GridLineColor = Color(0xFFE2E8F0)  // Slate-200 grid lines
val StarColor = Color(0xFF93C5FD)      // Soft celeste particles

// --- Data Classes ---
data class Cannonball(
    val id: Int,
    var x: Float,
    var y: Float,
    var vx: Float,
    var vy: Float,
    val radius: Float,
    val speed: Float,
    val gravity: Float = 0.12f,
    val trail: MutableList<Offset> = mutableListOf()
)

data class Particle(
    var x: Float,
    var y: Float,
    var vx: Float,
    var vy: Float,
    var life: Float,
    val maxLife: Float,
    val color: Color,
    val size: Float
)

data class Star(
    val x: Float,
    val y: Float,
    val size: Float,
    val alpha: Float
)

enum class GameState {
    MENU, PLAYING, GAME_OVER
}

@Composable
fun GameScreen() {
    val density = LocalDensity.current
    val configuration = LocalConfiguration.current
    val screenWidthPx = with(density) { configuration.screenWidthDp.dp.toPx() }
    val screenHeightPx = with(density) { configuration.screenHeightDp.dp.toPx() }

    val playerSize = 60f
    val halfPlayer = playerSize / 2f

    var gameState by remember { mutableStateOf(GameState.MENU) }
    var playerX by remember { mutableFloatStateOf(screenWidthPx / 2f) }
    var playerY by remember { mutableFloatStateOf(screenHeightPx - 200f) }
    var score by remember { mutableIntStateOf(0) }
    var highScore by remember { mutableIntStateOf(0) }
    var frameTime by remember { mutableLongStateOf(0L) }
    var cannonballIdCounter by remember { mutableIntStateOf(0) }
    var spawnTimer by remember { mutableFloatStateOf(0f) }
    var difficulty by remember { mutableFloatStateOf(1f) }
    var showGameOver by remember { mutableStateOf(false) }

    var lives by remember { mutableIntStateOf(3) }
    var lastHitFrame by remember { mutableLongStateOf(-100L) }
    val playerTrail = remember { mutableStateListOf<Offset>() }
    val isInvulnerable = frameTime - lastHitFrame < 90 // 1.5s at 60fps

    val cannonballs = remember { mutableStateListOf<Cannonball>() }
    val particles = remember { mutableStateListOf<Particle>() }
    val stars = remember {
        mutableStateListOf<Star>().apply {
            repeat(80) {
                add(Star(
                    x = Random.nextFloat() * screenWidthPx,
                    y = Random.nextFloat() * screenHeightPx,
                    size = Random.nextFloat() * 2f + 0.5f,
                    alpha = Random.nextFloat() * 0.4f + 0.1f
                ))
            }
        }
    }

    // Pulsating glow for the player cube
    val infiniteTransition = rememberInfiniteTransition(label = "playerGlow")
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.8f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glowAlpha"
    )

    val playerScale = remember { Animatable(1f) }

    // Game loop
    LaunchedEffect(gameState) {
        if (gameState == GameState.PLAYING) {
            showGameOver = false
            while (gameState == GameState.PLAYING) {
                val deltaTime = 16f / 1000f // ~60fps
                frameTime++
                score++
                difficulty = 1f + (score / 500f) * 0.5f

                // Update player trail
                playerTrail.add(Offset(playerX, playerY))
                if (playerTrail.size > 8) {
                    playerTrail.removeAt(0)
                }

                // Spawn cannonballs with 3 types of trajectories (Top, Left, Right)
                spawnTimer += deltaTime
                val spawnInterval = (0.8f / difficulty).coerceAtLeast(0.2f)
                if (spawnTimer >= spawnInterval) {
                    spawnTimer = 0f
                    val radius = Random.nextFloat() * 12f + 14f
                    val baseSpeed = (Random.nextFloat() * 4f + 3f) * difficulty
                    
                    val spawnType = Random.nextInt(3)
                    val ball = when (spawnType) {
                        1 -> { // Left Cannon: fire from left edge to the right in a high arc
                            val vyInit = -(Random.nextFloat() * 3f + 3f) * difficulty
                            val vxInit = (Random.nextFloat() * 3f + 4f) * difficulty
                            Cannonball(
                                id = cannonballIdCounter++,
                                x = -radius,
                                y = Random.nextFloat() * (screenHeightPx * 0.4f) + 150f,
                                vx = vxInit,
                                vy = vyInit,
                                radius = radius,
                                speed = baseSpeed,
                                gravity = 0.14f * difficulty.coerceAtMost(2f)
                            )
                        }
                        2 -> { // Right Cannon: fire from right edge to the left in a high arc
                            val vyInit = -(Random.nextFloat() * 3f + 3f) * difficulty
                            val vxInit = -(Random.nextFloat() * 3f + 4f) * difficulty
                            Cannonball(
                                id = cannonballIdCounter++,
                                x = screenWidthPx + radius,
                                y = Random.nextFloat() * (screenHeightPx * 0.4f) + 150f,
                                vx = vxInit,
                                vy = vyInit,
                                radius = radius,
                                speed = baseSpeed,
                                gravity = 0.14f * difficulty.coerceAtMost(2f)
                            )
                        }
                        else -> { // Top Spawner: drop from top with a minor horizontal angle
                            val vxInit = Random.nextFloat() * 4f - 2f
                            val vyInit = baseSpeed
                            Cannonball(
                                id = cannonballIdCounter++,
                                x = Random.nextFloat() * (screenWidthPx - radius * 2) + radius,
                                y = -radius * 2,
                                vx = vxInit,
                                vy = vyInit,
                                radius = radius,
                                speed = baseSpeed,
                                gravity = 0.06f * difficulty.coerceAtMost(2f)
                            )
                        }
                    }
                    cannonballs.add(ball)
                }

                // Update cannonballs
                val toRemove = mutableListOf<Cannonball>()
                for (ball in cannonballs) {
                    // Store trail
                    ball.trail.add(Offset(ball.x, ball.y))
                    if (ball.trail.size > 6) {
                        ball.trail.removeAt(0)
                    }
                    
                    // Natural parabolic motion: apply gravity and update coords
                    ball.vy += ball.gravity * (deltaTime * 60f)
                    ball.x += ball.vx * (deltaTime * 60f)
                    ball.y += ball.vy * (deltaTime * 60f)

                    // Remove off-screen (including left/right boundaries)
                    if (ball.y > screenHeightPx + ball.radius * 2 ||
                        ball.x < -ball.radius * 3 ||
                        ball.x > screenWidthPx + ball.radius * 3) {
                        toRemove.add(ball)
                    }

                    // Collision detection (circle vs rectangle)
                    val closestX = ball.x.coerceIn(playerX - halfPlayer, playerX + halfPlayer)
                    val closestY = ball.y.coerceIn(playerY - halfPlayer, playerY + halfPlayer)
                    val distX = ball.x - closestX
                    val distY = ball.y - closestY
                    val distance = sqrt(distX * distX + distY * distY)

                    if (distance < ball.radius) {
                        // Collision! Only handle damage if player is not invulnerable
                        if (!isInvulnerable) {
                            lastHitFrame = frameTime
                            lives--
                            
                            // Remove the cannonball immediately upon impact
                            toRemove.add(ball)

                            if (lives <= 0) {
                                // Game over!
                                gameState = GameState.GAME_OVER
                                if (score > highScore) highScore = score

                                // Spawn massive explosion particles (using NeonBlueGlow instead of White for visibility)
                                repeat(40) {
                                    val angle = Random.nextFloat() * Math.PI.toFloat() * 2f
                                    val speed2 = Random.nextFloat() * 8f + 2f
                                    val colors = listOf(ExplosionOrange, ExplosionYellow, NeonBlue, NeonBlueGlow)
                                    particles.add(
                                        Particle(
                                            x = playerX,
                                            y = playerY,
                                            vx = kotlin.math.cos(angle) * speed2,
                                            vy = kotlin.math.sin(angle) * speed2,
                                            life = 1f,
                                            maxLife = 1f,
                                            color = colors[Random.nextInt(colors.size)],
                                            size = Random.nextFloat() * 6f + 2f
                                        )
                                    )
                                }
                                break
                            } else {
                                // Spawn small impact splash of particles
                                repeat(15) {
                                    val angle = Random.nextFloat() * Math.PI.toFloat() * 2f
                                    val speed2 = Random.nextFloat() * 5f + 2f
                                    val colors = listOf(ExplosionOrange, NeonBlue, NeonBlueGlow)
                                    particles.add(
                                        Particle(
                                            x = closestX,
                                            y = closestY,
                                            vx = kotlin.math.cos(angle) * speed2,
                                            vy = kotlin.math.sin(angle) * speed2,
                                            life = 0.6f,
                                            maxLife = 0.6f,
                                            color = colors[Random.nextInt(colors.size)],
                                            size = Random.nextFloat() * 4f + 2f
                                        )
                                    )
                                }
                            }
                        }
                    }
                }
                cannonballs.removeAll(toRemove)

                // Update particles
                val deadParticles = mutableListOf<Particle>()
                for (p in particles) {
                    p.x += p.vx
                    p.y += p.vy
                    p.vy += 0.15f // gravity
                    p.life -= 0.02f
                    if (p.life <= 0f) deadParticles.add(p)
                }
                particles.removeAll(deadParticles)

                delay(16L)
            }
        }
    }

    // Show game over with delay for animation
    LaunchedEffect(gameState) {
        if (gameState == GameState.GAME_OVER) {
            delay(500)
            showGameOver = true
        }
    }

    // Update particles even when game is over
    LaunchedEffect(gameState) {
        if (gameState == GameState.GAME_OVER) {
            while (particles.isNotEmpty()) {
                val deadParticles = mutableListOf<Particle>()
                for (p in particles) {
                    p.x += p.vx
                    p.y += p.vy
                    p.vy += 0.15f
                    p.life -= 0.02f
                    if (p.life <= 0f) deadParticles.add(p)
                }
                particles.removeAll(deadParticles)
                delay(16L)
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
    ) {
        // Game Canvas
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(gameState) {
                    if (gameState == GameState.PLAYING) {
                        detectDragGestures { change, dragAmount ->
                            change.consume()
                            playerX = (playerX + dragAmount.x).coerceIn(halfPlayer, screenWidthPx - halfPlayer)
                            playerY = (playerY + dragAmount.y).coerceIn(halfPlayer, screenHeightPx - halfPlayer)
                        }
                    }
                }
        ) {
            // Draw background grid
            drawGrid(screenWidthPx, screenHeightPx)

            // Draw stars as celestial soft particles
            for (star in stars) {
                drawCircle(
                    color = StarColor.copy(alpha = star.alpha),
                    radius = star.size * 2f, // slightly larger soft particles
                    center = Offset(star.x, star.y)
                )
            }

            if (gameState == GameState.PLAYING || gameState == GameState.GAME_OVER) {
                // Draw cannonball trails
                for (ball in cannonballs) {
                    for (i in ball.trail.indices) {
                        val alpha = (i.toFloat() / ball.trail.size) * 0.3f
                        val trailRadius = ball.radius * (i.toFloat() / ball.trail.size) * 0.7f
                        drawCircle(
                            color = CannonballHighlight.copy(alpha = alpha),
                            radius = trailRadius,
                            center = ball.trail[i]
                        )
                    }
                }

                // Draw cannonballs
                for (ball in cannonballs) {
                    // Outer glow (soft slate gray glow)
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                Color(0xFF64748B).copy(alpha = 0.15f),
                                Color.Transparent
                            ),
                            center = Offset(ball.x, ball.y),
                            radius = ball.radius * 2f
                        ),
                        radius = ball.radius * 2f,
                        center = Offset(ball.x, ball.y)
                    )

                    // Main cannonball body
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                CannonballHighlight,
                                CannonballDark,
                                Color(0xFF1E293B)
                            ),
                            center = Offset(ball.x - ball.radius * 0.3f, ball.y - ball.radius * 0.3f),
                            radius = ball.radius * 1.2f
                        ),
                        radius = ball.radius,
                        center = Offset(ball.x, ball.y)
                    )

                    // Highlight / shine
                    drawCircle(
                        color = Color.White.copy(alpha = 0.15f),
                        radius = ball.radius * 0.4f,
                        center = Offset(ball.x - ball.radius * 0.25f, ball.y - ball.radius * 0.25f)
                    )

                    // Cannonball border
                    drawCircle(
                        color = Color(0xFF475569).copy(alpha = 0.5f),
                        radius = ball.radius,
                        center = Offset(ball.x, ball.y),
                        style = Stroke(width = 1.5f)
                    )
                }

                // Draw player trail first
                if (gameState == GameState.PLAYING) {
                    for (i in playerTrail.indices) {
                        val trailPos = playerTrail[i]
                        val trailRatio = (i.toFloat() / playerTrail.size)
                        val trailAlpha = trailRatio * 0.35f
                        val trailScaleSize = playerSize * (0.5f + trailRatio * 0.5f)
                        val halfTrailSize = trailScaleSize / 2f
                        
                        drawRect(
                            brush = Brush.linearGradient(
                                colors = listOf(
                                    NeonBlueGlow.copy(alpha = trailAlpha),
                                    NeonBlue.copy(alpha = trailAlpha * 0.4f)
                                ),
                                start = Offset(trailPos.x - halfTrailSize, trailPos.y - halfTrailSize),
                                end = Offset(trailPos.x + halfTrailSize, trailPos.y + halfTrailSize)
                            ),
                            topLeft = Offset(trailPos.x - halfTrailSize, trailPos.y - halfTrailSize),
                            size = Size(trailScaleSize, trailScaleSize)
                        )
                    }
                }

                // Draw player cube (only when playing or just died)
                if (gameState == GameState.PLAYING && (!isInvulnerable || (frameTime / 4) % 2 == 0L)) {
                    // Glow effect
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                NeonBlue.copy(alpha = glowAlpha * 0.4f),
                                NeonBlueGlow.copy(alpha = glowAlpha * 0.15f),
                                Color.Transparent
                            ),
                            center = Offset(playerX, playerY),
                            radius = playerSize * 2f
                        ),
                        radius = playerSize * 2f,
                        center = Offset(playerX, playerY)
                    )

                    // Player cube shadow
                    drawRect(
                        color = Color.Black.copy(alpha = 0.15f), // softer shadow for light background
                        topLeft = Offset(playerX - halfPlayer + 4f, playerY - halfPlayer + 4f),
                        size = Size(playerSize, playerSize)
                    )

                    // Player cube body
                    drawRect(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                Color(0xFF38BDF8), // Light sky blue
                                NeonBlue,
                                Color(0xFF0284C7)  // Deep sky blue
                            ),
                            start = Offset(playerX - halfPlayer, playerY - halfPlayer),
                            end = Offset(playerX + halfPlayer, playerY + halfPlayer)
                        ),
                        topLeft = Offset(playerX - halfPlayer, playerY - halfPlayer),
                        size = Size(playerSize, playerSize)
                    )

                    // Inner highlight
                    drawRect(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                Color.White.copy(alpha = 0.35f),
                                Color.Transparent
                            ),
                            start = Offset(playerX - halfPlayer, playerY - halfPlayer),
                            end = Offset(playerX, playerY)
                        ),
                        topLeft = Offset(playerX - halfPlayer + 4f, playerY - halfPlayer + 4f),
                        size = Size(playerSize / 2f, playerSize / 2f)
                    )

                    // Border glow
                    drawRect(
                        color = NeonBlue.copy(alpha = glowAlpha),
                        topLeft = Offset(playerX - halfPlayer, playerY - halfPlayer),
                        size = Size(playerSize, playerSize),
                        style = Stroke(width = 2.5f)
                    )

                    // Corner accents
                    val cornerLength = 10f
                    val corners = listOf(
                        // Top-left
                        Offset(playerX - halfPlayer, playerY - halfPlayer),
                        // Top-right
                        Offset(playerX + halfPlayer, playerY - halfPlayer),
                        // Bottom-left
                        Offset(playerX - halfPlayer, playerY + halfPlayer),
                        // Bottom-right
                        Offset(playerX + halfPlayer, playerY + halfPlayer)
                    )
                    for (corner in corners) {
                        val xDir = if (corner.x < playerX) 1f else -1f
                        val yDir = if (corner.y < playerY) 1f else -1f
                        drawLine(
                            color = Color.White.copy(alpha = 0.8f),
                            start = corner,
                            end = Offset(corner.x + cornerLength * xDir, corner.y),
                            strokeWidth = 2f
                        )
                        drawLine(
                            color = Color.White.copy(alpha = 0.8f),
                            start = corner,
                            end = Offset(corner.x, corner.y + cornerLength * yDir),
                            strokeWidth = 2f
                        )
                    }
                }

                // Draw particles
                for (p in particles) {
                    val alpha = (p.life / p.maxLife).coerceIn(0f, 1f)
                    drawCircle(
                        color = p.color.copy(alpha = alpha),
                        radius = p.size * (p.life / p.maxLife),
                        center = Offset(p.x, p.y)
                    )
                    // Glow
                    drawCircle(
                        color = p.color.copy(alpha = alpha * 0.3f),
                        radius = p.size * (p.life / p.maxLife) * 2f,
                        center = Offset(p.x, p.y)
                    )
                }
            }
        }

        // HUD - Score and Lives display
        if (gameState == GameState.PLAYING) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 48.dp, start = 24.dp, end = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Lives indicator (Left)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    repeat(3) { index ->
                        val active = index < lives
                        Text(
                            text = "❤️",
                            fontSize = 22.sp,
                            modifier = Modifier
                                .blur(if (active && isInvulnerable && (frameTime / 8) % 2 == 0L) 1.dp else 0.dp),
                            alpha = if (active) 1f else 0.2f
                        )
                    }
                }

                // Score (Right)
                Column(
                    horizontalAlignment = Alignment.End
                ) {
                    Text(
                        text = "SCORE",
                        style = TextStyle(
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF64748B),
                            letterSpacing = 3.sp
                        )
                    )
                    Text(
                        text = "$score",
                        style = TextStyle(
                            fontSize = 32.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF0F172A),
                            letterSpacing = 1.sp
                        )
                    )
                }
            }
        }

        // Menu Screen
        if (gameState == GameState.MENU) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Title
                Text(
                    text = "CANNON",
                    style = TextStyle(
                        fontSize = 52.sp,
                        fontWeight = FontWeight.Black,
                        color = NeonBlue,
                        letterSpacing = 12.sp,
                        textAlign = TextAlign.Center
                    )
                )
                Text(
                    text = "DODGE",
                    style = TextStyle(
                        fontSize = 52.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF0F172A), // Slate 900 for light theme contrast
                        letterSpacing = 12.sp,
                        textAlign = TextAlign.Center
                    )
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Esquiva las bolas de cañón",
                    style = TextStyle(
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Normal,
                        color = Color(0xFF475569), // Slate 600
                        textAlign = TextAlign.Center
                    )
                )
                Spacer(modifier = Modifier.height(60.dp))

                // Play button
                Button(
                    onClick = {
                        playerX = screenWidthPx / 2f
                        playerY = screenHeightPx - 200f
                        score = 0
                        cannonballs.clear()
                        particles.clear()
                        spawnTimer = 0f
                        difficulty = 1f
                        cannonballIdCounter = 0
                        lives = 3
                        lastHitFrame = -100L
                        playerTrail.clear()
                        gameState = GameState.PLAYING
                    },
                    modifier = Modifier
                        .width(220.dp)
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = NeonBlue
                    )
                ) {
                    Text(
                        text = "JUGAR",
                        style = TextStyle(
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = DarkBackground,
                            letterSpacing = 6.sp
                        )
                    )
                }

                if (highScore > 0) {
                    Spacer(modifier = Modifier.height(24.dp))
                    Text(
                        text = "RÉCORD: $highScore",
                        style = TextStyle(
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium,
                            color = ScoreGold,
                            letterSpacing = 2.sp
                        )
                    )
                }

                Spacer(modifier = Modifier.height(80.dp))
                Text(
                    text = "Arrastra para mover el cubo",
                    style = TextStyle(
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Normal,
                        color = Color(0xFF94A3B8), // Slate 400
                        textAlign = TextAlign.Center
                    )
                )
            }
        }

        // Game Over Screen
        AnimatedVisibility(
            visible = showGameOver,
            enter = fadeIn(tween(400)) + scaleIn(tween(400), initialScale = 0.8f)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.6f))
                    .padding(32.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "GAME",
                    style = TextStyle(
                        fontSize = 56.sp,
                        fontWeight = FontWeight.Black,
                        color = GameOverRed,
                        letterSpacing = 8.sp,
                        textAlign = TextAlign.Center
                    )
                )
                Text(
                    text = "OVER",
                    style = TextStyle(
                        fontSize = 56.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        letterSpacing = 8.sp,
                        textAlign = TextAlign.Center
                    )
                )
                Spacer(modifier = Modifier.height(32.dp))

                // Score display
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color(0xFF1A1A3E),
                                    Color(0xFF0D0D24)
                                )
                            )
                        )
                        .padding(horizontal = 40.dp, vertical = 20.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "PUNTUACIÓN",
                            style = TextStyle(
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = NeonBlue.copy(alpha = 0.7f),
                                letterSpacing = 3.sp
                            )
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "$score",
                            style = TextStyle(
                                fontSize = 40.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        )
                        if (score >= highScore && highScore > 0) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "¡NUEVO RÉCORD!",
                                style = TextStyle(
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = ScoreGold,
                                    letterSpacing = 2.sp
                                )
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(40.dp))

                // Retry button
                Button(
                    onClick = {
                        playerX = screenWidthPx / 2f
                        playerY = screenHeightPx - 200f
                        score = 0
                        cannonballs.clear()
                        particles.clear()
                        spawnTimer = 0f
                        difficulty = 1f
                        cannonballIdCounter = 0
                        lives = 3
                        lastHitFrame = -100L
                        playerTrail.clear()
                        showGameOver = false
                        gameState = GameState.PLAYING
                    },
                    modifier = Modifier
                        .width(220.dp)
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = NeonBlue
                    )
                ) {
                    Text(
                        text = "REINTENTAR",
                        style = TextStyle(
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = DarkBackground,
                            letterSpacing = 4.sp
                        )
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Menu button
                Button(
                    onClick = {
                        cannonballs.clear()
                        particles.clear()
                        showGameOver = false
                        gameState = GameState.MENU
                    },
                    modifier = Modifier
                        .width(220.dp)
                        .height(48.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.Transparent
                    ),
                    border = BorderStroke(1.5.dp, NeonBlue.copy(alpha = 0.5f))
                ) {
                    Text(
                        text = "MENÚ",
                        style = TextStyle(
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium,
                            color = NeonBlue,
                            letterSpacing = 4.sp
                        )
                    )
                }
            }
        }
    }
}

private fun DrawScope.drawGrid(width: Float, height: Float) {
    val gridSpacing = 60f
    var x = 0f
    while (x <= width) {
        drawLine(
            color = GridLineColor,
            start = Offset(x, 0f),
            end = Offset(x, height),
            strokeWidth = 0.5f
        )
        x += gridSpacing
    }
    var y = 0f
    while (y <= height) {
        drawLine(
            color = GridLineColor,
            start = Offset(0f, y),
            end = Offset(width, y),
            strokeWidth = 0.5f
        )
        y += gridSpacing
    }
}
