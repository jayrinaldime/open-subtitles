import logging
import time
from contextlib import contextmanager
from typing import Optional, Any


class ExecutionTimeLogger:
    def __init__(
        self,
        logger: Optional[logging.Logger] = None,
        log_level: int = logging.INFO,
        message: Optional[str] = None,
        parent: Optional["ExecutionTimeLogger"] = None,
    ):
        self.logger = logger or logging.getLogger(__name__)
        self.log_level = log_level
        self.message = message or "Execution"
        self.start_time = time.time()
        self.sub_logs = []
        self.parent = parent
        self.children = []

    def log(self, message: str, level: Optional[int] = None):
        """
        Add a sub-log within the execution context

        :param message: Log message
        :param level: Optional log level (defaults to the timer's log level)
        :return: A new ExecutionTimeLogger for nested timing
        """
        log_level = level or self.log_level
        timestamp = time.time() - self.start_time
        sub_log_entry = f"[{timestamp:.4f}s] {message} - START"
        self.sub_logs.append(sub_log_entry)
        self.logger.log(log_level, sub_log_entry)

        # Create a child timer for nested timing
        child_timer = ExecutionTimeLogger(
            logger=self.logger, log_level=log_level, message=message, parent=self
        )
        self.children.append(child_timer)
        return child_timer

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        current_time = time.time()
        duration = current_time - self.start_time
        final_log = f"{self.message} - END - Total Duration: {duration:.4f} seconds"

        # # Collect child logs
        # if self.children:
        #     child_logs = []
        #     for child in self.children:
        #         child_duration = current_time - child.start_time
        #         child_logs.append(f"  {child.message}: {child_duration:.4f} seconds")
        #     final_log += "\nChild Timings:\n" + "\n".join(child_logs)

        # # Combine sub-logs if any
        # if self.sub_logs:
        #     final_log += f"\nSub-logs:\n" + "\n".join(
        #         f"  {log}" for log in self.sub_logs
        #     )

        self.logger.log(self.log_level, final_log)

        # If this timer has a parent, update parent's children
        if self.parent:
            self.parent.children.append(self)

        return False  # Propagate any exceptions


if __name__ == "__main__":
    # USAGE EXAMPLE
    import logging
    import time

    # Configure logging
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
    )
    logger = logging.getLogger(__name__)

    def example_function():
        with ExecutionTimeLogger(logger, message="Complex Operation") as timer:
            # Simulate some work with nested timing
            with timer.log("First Phase") as phase1:
                time.sleep(1)

                with phase1.log("Detailed Substep") as substep:
                    time.sleep(0.5)

            with timer.log("Second Phase") as phase2:
                time.sleep(0.3)

    # Run the example
    example_function()
