import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';
import 'package:flutter_shaders/flutter_shaders.dart';
import 'package:textf/textf.dart';

void main() {
  runApp(const MyApp());
}

const Duration kAnimationDuration = Duration(milliseconds: 1000);
const drawSteps = [
  r'''**1.**
`sdHeart = sqrt(dot2(p - 0.5 * 
(p.x + p.y)
))`
Distance to bottom right line''',

  r'''**2.**
`sdHeart = sqrt(dot2(p - 0.5 * 
max(0.0, p.x + p.y)
))`
Take the max with zero to turn it into a ray from the bottom point of the heart.
See step 7-without-2 for what happens if we don't do this.''',

  r'''**3.**
`sdHeart = sqrt(
min(
dot2(p - centerTopInnerVertex), 
dot2(p - 0.5 * max(0.0, p.x + p.y))
))`
Use a min function to union with the distance from the top center point.
See step 7-without-3 for what happens if we don't do this.''',

  r'''**4.**
`sdHeart = sign(p.x - p.y) *
sqrt(min(dot2(p - centerTopInnerVertex), 
  dot2(p - 0.5 * max(0.0, p.x + p.y))))`
Multiply by sign(p.x - p.y) to negate distance for points above the line x-y=0 (bottom right).
This will cause points below this line to be considered within the heart.
  ''',

  r'''**5.**
`if (p.x + p.y > 1.0)
  return sqrt(dot2(p - circleCenter));
  ...`
If we're beyond the line from center top inner vertex (0,1) toward (1,0), calculate distance to the circle at (0.25, 0.75).
  ''',

  r'''**6.**
`if (p.x + p.y > 1.0)
  return  -sqrt(dot2(centerTopInnerVertex - circleCenter)) +
    sqrt(dot2(p - circleCenter));
  ...`
Expand the point into a circle by subtracting the radius of the circle.
  ''',

  r'''**7.**
`p.x = abs(p.x);
  ...`
Mirror horizontally across x=0 by taking the absolute value of x.
This gives us the final heart!
  ''',

  r'''**7-without-2.**
`// min(0.0,
(p.x + p.y)`
What if we left the bottom right line as a ray?
Without debug mode on, you can see the black border gain a sharp point at the bottom.
With debug mode on, it's easier to see how the bottom distance field changes from circular to a sharp V.
  ''',

  r'''**7-without-3.**
`//dot2(p - centerTopInnerVertex),`
What if we left out the top vertex?
The distance to the bottom point dominates until the circle distance takes over.
Without debug mode on, everything looks fine.
With debug mode on, you might notice how the internal distance near the top point is now sharp instead of rounded.
  ''',

  r'''**7.**
`float sdHeart(in vec2 p) {
  p.x = abs(p.x); 
  if (p.x + p.y > 1.0) 
    return -sqrt(dot2(centerTopInnerVertex - circleCenter)) + sqrt(dot2(p - circleCenter));
  return sign(p.x - p.y) * sqrt(min(dot2(p - centerTopInnerVertex), dot2(p - 0.5 * max(0.0, p.x + p.y))));
}`
Full heart SDF method.
  ''',
];

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Heart SDF Breakdown',
      theme: ThemeData(colorSchemeSeed: Colors.blue),
      home: const MyHomePage(),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key});

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> with TickerProviderStateMixin {
  late PageController _pageController;
  late TabController _tabController;
  late AnimationController _shaderDrawStepIndexAnimationController;
  int _currentPageIndex = 0;
  bool shouldRenderDebug = true;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _tabController = TabController(length: drawSteps.length, vsync: this);
    _shaderDrawStepIndexAnimationController = AnimationController.unbounded(
      duration: kAnimationDuration,
      vsync: this,
      animationBehavior: AnimationBehavior.normal,
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    _tabController.dispose();
    _shaderDrawStepIndexAnimationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Heart Shader Breakdown')),
      body: Stack(
        children: <Widget>[
          HeartShader(
            controller: _shaderDrawStepIndexAnimationController,
            shouldRenderDebug: shouldRenderDebug,
          ),
          PageView(
            /// [PageView.scrollDirection] defaults to [Axis.horizontal].
            /// Use [Axis.vertical] to scroll vertically.
            controller: _pageController,
            onPageChanged: _handlePageViewChanged,
            children: drawSteps
                .map((text) => DescriptionPanel(text: text))
                .toList(),
          ),
          Column(
            children: [
              PageIndicator(
                tabController: _tabController,
                currentPageIndex: _currentPageIndex,
                onUpdateCurrentPageIndex: _updateCurrentPageIndex,
                isOnDesktopAndWeb: _isOnDesktopAndWeb,
              ),
              Container(
                width: MediaQuery.of(context).size.width * 0.5,
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4.0),
                  color: Colors.white.withValues(alpha: 0.5),
                  backgroundBlendMode: BlendMode.plus,
                ),
                child: SwitchListTile(
                  title: const Text('Render debug'),
                  value: shouldRenderDebug,
                  onChanged: (bool value) {
                    setState(() {
                      shouldRenderDebug = value;
                    });
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _handlePageViewChanged(int currentPageIndex) {
    if (!_isOnDesktopAndWeb) {
      return;
    }
    _tabController.index = currentPageIndex;
    setState(() {
      _currentPageIndex = currentPageIndex;
    });
  }

  void _updateCurrentPageIndex(int index) {
    _tabController.index = index;
    _pageController.jumpToPage(index);
    // I disabled page animation because I felt it doesn't look good
    // with the text, and it distracts from the SDF draw step animation.

    // _pageController.animateToPage(
    //   index,
    //   duration: kAnimationDuration,
    //   curve: Curves.elasticOut,
    // );

    // Avoid animating through too many steps by jumping to the nearest step if we are more than 1 step away.
    double diff =
        _shaderDrawStepIndexAnimationController.value - index.toDouble();
    if (diff > 1.0) {
      _shaderDrawStepIndexAnimationController.value = index.toDouble() + 1.0;
    } else if (diff < -1.0) {
      _shaderDrawStepIndexAnimationController.value = index.toDouble() - 1.0;
    }
    _shaderDrawStepIndexAnimationController.animateTo(
      index.toDouble(),
      duration: kAnimationDuration,
      curve: Curves.easeInOut,
    );

    // I originally tried animating with a spring, but felt the easeInOut looked better.

    // const SpringDescription spring = SpringDescription(
    //   mass: 3,
    //   stiffness: 600,
    //   damping: 30,
    // );
    // _shaderDrawStepIndexAnimationController.animateWith(
    //   SpringSimulation(
    //     spring,
    //     _shaderDrawStepIndexAnimationController.value,
    //     index.toDouble(),
    //     0,
    //     snapToEnd: true,
    //   ),
    // );
  }

  bool get _isOnDesktopAndWeb =>
      kIsWeb ||
      switch (defaultTargetPlatform) {
        TargetPlatform.macOS ||
        TargetPlatform.linux ||
        TargetPlatform.windows => true,
        TargetPlatform.android ||
        TargetPlatform.iOS ||
        TargetPlatform.fuchsia => false,
      };
}

class DescriptionPanel extends StatelessWidget {
  const DescriptionPanel({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final TextTheme textTheme = Theme.of(context).textTheme;
    return Align(
      alignment: Alignment.bottomLeft,
      child: Container(
        padding: const EdgeInsets.all(16.0),
        color: Colors.white.withValues(alpha: 0.5),
        child: Textf(text, style: textTheme.titleLarge),
      ),
    );
  }
}

class HeartShader extends StatelessWidget {
  const HeartShader({
    super.key,
    required this.controller,
    required this.shouldRenderDebug,
  });

  final AnimationController controller;
  final bool shouldRenderDebug;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        return ShaderBuilder(
          assetKey: 'shaders/heartsdf.frag',
          (context, shader, child) => CustomPaint(
            size: MediaQuery.of(context).size,
            painter: ShaderPainter(
              shader: shader,
              drawStepIndex: controller.value,
              shouldRenderDebug: shouldRenderDebug,
            ),
          ),
          child: const Center(child: CircularProgressIndicator()),
        );
      },
    );
  }
}

class ShaderPainter extends CustomPainter {
  double _drawStepIndex = 0;
  bool _shouldRenderDebug = true;
  ShaderPainter({
    required this.shader,
    required double drawStepIndex,
    required bool shouldRenderDebug,
  }) {
    _drawStepIndex = drawStepIndex;
    _shouldRenderDebug = shouldRenderDebug;
  }
  ui.FragmentShader shader;

  @override
  void paint(Canvas canvas, Size size) {
    shader.setFloat(0 /* resolution.x */, size.width);
    shader.setFloat(1 /* resolution.y */, size.height);
    shader.setFloat(2 /* drawStepIndex */, _drawStepIndex);
    shader.setFloat(3 /* shouldRenderDebug */, _shouldRenderDebug ? 1.0 : 0.0);

    final paint = Paint()..shader = shader;
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    // // Always repaint for the shader animation.
    // return true;

    // When I tried something like the below,
    // the shader did not update consistently during animation.
    // TODO: investigate this in more detail.

    return oldDelegate is ShaderPainter &&
        oldDelegate._drawStepIndex != _drawStepIndex &&
        oldDelegate._shouldRenderDebug != _shouldRenderDebug;
  }
}

// Copied and modified from https://api.flutter.dev/flutter/widgets/PageView-class.html
/// Page indicator for desktop and web platforms.
///
/// On Desktop and Web, drag gesture for horizontal scrolling in a PageView is disabled by default.
/// You can defined a custom scroll behavior to activate drag gestures,
/// see https://docs.flutter.dev/release/breaking-changes/default-scroll-behavior-drag.
///
/// In this sample, we use a TabPageSelector to navigate between pages,
/// in order to build natural behavior similar to other desktop applications.
class PageIndicator extends StatelessWidget {
  const PageIndicator({
    super.key,
    required this.tabController,
    required this.currentPageIndex,
    required this.onUpdateCurrentPageIndex,
    required this.isOnDesktopAndWeb,
  });

  final int currentPageIndex;
  final TabController tabController;
  final void Function(int) onUpdateCurrentPageIndex;
  final bool isOnDesktopAndWeb;

  @override
  Widget build(BuildContext context) {
    if (!isOnDesktopAndWeb) {
      return const SizedBox.shrink();
    }
    final ColorScheme colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.all(12.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          IconButton(
            splashRadius: 32.0,
            padding: EdgeInsets.all(4.0),
            onPressed: () {
              if (currentPageIndex == 0) {
                onUpdateCurrentPageIndex(tabController.length - 1);
                return;
              }
              onUpdateCurrentPageIndex(currentPageIndex - 1);
            },
            icon: const Icon(
              Icons.arrow_left_rounded,
              size: 64.0,
              color: Colors.white,
            ),
          ),
          TabPageSelector(
            controller: tabController,
            color: colorScheme.surface,
            selectedColor: colorScheme.primary,
          ),
          IconButton(
            splashRadius: 32.0,
            padding: EdgeInsets.all(4.0),
            onPressed: () {
              if (currentPageIndex == tabController.length - 1) {
                onUpdateCurrentPageIndex(0);
                return;
              }
              onUpdateCurrentPageIndex(currentPageIndex + 1);
            },
            icon: const Icon(
              Icons.arrow_right_rounded,
              size: 64.0,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
