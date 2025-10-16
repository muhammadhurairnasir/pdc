#include <stdio.h>
#include <stdlib.h>
#include <mpi.h>

int main(int argc, char* argv[]) {
    int rank, size;
    long N = 10000000;     // Vector size
    double *A = NULL;
    double local_sum = 0.0, global_sum = 0.0;  // Used in old logic
    double total_sum = 0.0, avg = 0.0;         // Used in bonus logic

    MPI_Init(&argc, &argv);
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);

    long local_n = N / size; // Divide data equally
    double *local_A = (double*)malloc(local_n * sizeof(double));

    // Root initializes data
    if (rank == 0) {
        A = (double*)malloc(N * sizeof(double));
        for (long i = 0; i < N; i++)
            A[i] = i + 1;
    }

    // Scatter data to all processes
    MPI_Scatter(A, local_n, MPI_DOUBLE, local_A, local_n, MPI_DOUBLE, 0, MPI_COMM_WORLD);

    // Each process computes its local sum
    for (long i = 0; i < local_n; i++)
        local_sum += local_A[i];

    /*
    ==============================================================================
    OLD LOGIC (Using MPI_Reduce)
    ==============================================================================
    This part is the original version from the main lab (before Bonus Challenge).
    It uses MPI_Reduce to send all partial sums to the root process only.
    
    MPI_Reduce(&local_sum, &global_sum, 1, MPI_DOUBLE, MPI_SUM, 0, MPI_COMM_WORLD);

    if (rank == 0) {
        double expected = (N * (N + 1)) / 2.0;
        printf("===== ORIGINAL LOGIC (MPI_Reduce) =====\n");
        printf("Total Sum = %.0f | Expected = %.0f | Difference = %.5f\n",
               global_sum, expected, expected - global_sum);
        free(A);
    }
    */

    /*
    ==============================================================================
    BONUS CHALLENGE (Using MPI_Allreduce + Average + Timing)
    ==============================================================================
    Modifications:
    ---------------
    1. Uses MPI_Allreduce so every process gets the total sum.
    2. Computes average.
    3. Measures execution time using MPI_Wtime().
    4. Compares with serial computation.
    ==============================================================================
    */

    // Start timing parallel computation
    double start_parallel = MPI_Wtime();

    // Perform Allreduce (sum available to all)
    MPI_Allreduce(&local_sum, &total_sum, 1, MPI_DOUBLE, MPI_SUM, MPI_COMM_WORLD);

    // End timing parallel computation
    double end_parallel = MPI_Wtime();

    // Compute average (all processes can compute since total_sum is global)
    avg = total_sum / N;

    // Serial computation (only root does this for comparison)
    double serial_sum = 0.0;
    double start_serial = 0.0, end_serial = 0.0;

    if (rank == 0) {
        start_serial = MPI_Wtime();
        for (long i = 0; i < N; i++)
            serial_sum += A[i];
        end_serial = MPI_Wtime();

        double expected = (N * (N + 1)) / 2.0;

        printf("\n===== BONUS CHALLENGE (MPI_Allreduce) =====\n");
        printf("Total Sum = %.0f | Expected = %.0f | Difference = %.5f\n",
               total_sum, expected, expected - total_sum);
        printf("Average = %.5f\n", avg);
        printf("Parallel Time = %.6f sec\n", end_parallel - start_parallel);

        printf("\n===== SERIAL COMPUTATION =====\n");
        printf("Serial Sum = %.0f | Time = %.6f sec\n",
               serial_sum, end_serial - start_serial);

        printf("\n===== PERFORMANCE COMPARISON =====\n");
        printf("Speedup = %.2fx\n",
               (end_serial - start_serial) / (end_parallel - start_parallel));
    }

    // Free memory
    free(local_A);
    if (rank == 0)
        free(A);

    MPI_Finalize();
    return 0;
}
