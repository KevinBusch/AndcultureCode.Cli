#!/usr/bin/env node

/**************************************************************************************************
 * Imports
 **************************************************************************************************/

const { spawn, spawnSync } = require("child_process");
const dir                  = require("./_modules/dir");
const dotnetBuild          = require("./_modules/dotnet-build");
const dotnetPath           = require("./_modules/dotnet-path");
const echo                 = require("./_modules/echo");
const program              = require("commander");
const shell                = require("shelljs");

/**************************************************************************************************
 * Variables
 **************************************************************************************************/

const coverageFlags = "-p:CollectCoverage=true -p:CoverletOutputFormat=opencover";

/**************************************************************************************************
 * Commands
 **************************************************************************************************/

// #region Commands

const dotnetTest = {
    cmd: "dotnet test --no-build --no-restore",
    descriptionSkipClean() {
        return "Skips the clean, build, and restore steps before running the dotnet test runner. This will speed up sequential runs if intentionally running on the same assemblies.";
    },
    description() {
        return `Runs dotnet test runner on the ${dotnetPath.solutionPath()} solution (via ${this.cmd})`;
    },
    runByProject(skipClean) {
        // Check for the solution path before attempting any work
        dotnetPath.solutionPathOrExit();

        if (!skipClean) {
            dotnetBuild.run(true, true);
        }

        const solutionDir = dotnetPath.solutionDir();
        dir.pushd(solutionDir);

        const testProjects = shell.find("**/*.Test*.csproj");
        if (testProjects == null || testProjects.length === 0) {
            echo.error("Could not find any csproj files matching the pattern *.Test*.csproj.");
            shell.exit(1);
        }

        echo.message(`Found ${testProjects.length} test projects in the ${dotnetPath.solutionDir()} solution...`);

        // Since the spawnSync function takes the base command and all arguments separately, we cannot
        // leverage the base dotnet test command string here. We'll build out the arg list in an array.
        let cmd = "dotnet";

        /* Keep an array of result objects to output later, in the structure of:
            {
                code: 1,
                name: "ExampleProject.Core.Tests",
                stderr: "...",
                stdout: "...",
            }
        */
        const results = [];

        testProjects.forEach((project) => {
            const args = ["test", "--no-build", "--no-restore"];

            if (program.coverage) {
                // The two coverage flags need to be pushed onto the args array before the project name
                // it seems. The dotnet command was not recognizing them at the end of the args array.
                args.push(coverageFlags);
            }

            let message = `Running tests in the ${project} project... via (${cmd} ${args.join(" ")} ${project})`;

            if (program.args.length > 0) {
                const filter = program.args;
                args.push("--filter", filter);
                message = `Running tests in the ${project} project that match the xunit filter of '${filter}' via (${cmd} ${args.join(" ")} ${project})`;
            }

            // Push the project name on as the last arg in the array
            args.push(project);

            echo.message(message);

            // Intentionally piping output to capture it for later use when determining failures
            const result = spawnSync(cmd, args, { stdio: "pipe", shell: false });
            results.push({
                code: result.status,
                name: project,
                stderr: result.stderr,
                stdout: result.stdout,
            });

            echo.message(result.stdout);
        });

        // Check the results array for any non-zero exit codes and display helpful output for each
        const failedProjects = results.filter((testResult) => testResult.code !== 0);
        if (failedProjects.length > 0) {
            failedProjects.forEach((testResult) => {
                echo.headerError(`Failed tests for ${testResult.name}`);
                echo.error(testResult.stderr);
            });

            echo.error(`${failedProjects.length} test projects exited with non-zero exit status. See above output for more detail.`);
            shell.exit(1);
        }

        dir.popd();
        echo.newLine();
        echo.message("Exited dotnet-test");
    },
    runBySolution(skipClean) {
        // Check for the solution path before attempting any work
        dotnetPath.solutionPathOrExit();

        if (!skipClean) {
            dotnetBuild.run(true, true);
        }

        const solutionDir = dotnetPath.solutionDir();

        dir.pushd(solutionDir);

        // Copy over base dotnet test command & args to chain on additional args and apply conditional messaging
        let cmd = this.cmd;

        if (program.coverage) {
            cmd = `${cmd} ${coverageFlags}`;
        }

        let message = `Running all tests in the ${dotnetPath.solutionPath()} solution... via (${cmd})`;

        if (program.args.length > 0) {
            const filter = program.args;
            cmd = `${cmd} --filter ${filter}`;
            message = `Running tests in the ${dotnetPath.solutionPath()} solution that match the xunit filter of '${filter}' via (${cmd})`;
        }

        echo.message(message);

        const child = spawn(cmd, { stdio: "inherit", shell: true });
        child.on("exit", (code, signal) => {
            if (code !== 0) {
                echo.error(`Exited with error '${signal ? signal : code}'`);
                shell.exit(code);
            }

            dir.popd();
            echo.newLine();
            echo.message("Exited dotnet-test");
        });
    },
};

// #endregion Commands


/**************************************************************************************************
 * Entrypoint / Command router
 **************************************************************************************************/

// #region Entrypoint / Command router

program
    .usage("option")
    .description(dotnetTest.description())
    .option("--by-project", "Runs all test projects for the solution serially")
    .option("--coverage",  "Additionally run tests with code coverage via coverlet")
    .option("-s, --skip-clean", dotnetTest.descriptionSkipClean())
    .parse(process.argv);

if (!program.byProject) {
    dotnetTest.runBySolution(program.skipClean);
}

if (program.byProject === true) {
    dotnetTest.runByProject(program.skipClean);
}

// #endregion Entrypoint / Command router

exports.dotnetTest = dotnetTest;
