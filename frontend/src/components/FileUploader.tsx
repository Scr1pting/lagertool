import { useState, useRef } from "react";
import type { ChangeEvent } from "react";
import axios from "axios";
import { Button } from "./ui/button";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
} from "./ui/card";

type UploadStatus = "idle" | "uploading" | "success" | "error";

type Props = {
	wrapInCard?: boolean
	uploadUrl: string
	templateUrl: string
}

export default function FileUploader({ wrapInCard = true, uploadUrl, templateUrl }: Props) {
	const [file, setFile] = useState<File | null>(null);
	const [status, setStatus] = useState<UploadStatus>("idle");
	const [uploadProgress, setUploadProgress] = useState<number>(0);
	const [serverMessage, setServerMessage] = useState<string>("");

	const inputRef = useRef<HTMLInputElement | null>(null);

	function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
		const f = e.target.files?.[0] ?? null;
		setFile(f);
		setServerMessage("");
		setStatus("idle");
	}

	function csvToJson(csvText: string, schema: Record<string, string> = {}) {
		const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");
		if (lines.length === 0) return [];

		const headers = lines[0].split(",").map((h) => h.trim());

		const data = lines.slice(1).map((line) => {
			const values = line.split(",");
			const obj: Record<string, any> = {};


			headers.forEach((h, i) => {
				const raw = values[i]?.trim() ?? "";
				let val: any = raw;

				const type = schema[h] ?? "string"; // default to string
				if (type === "number") val = raw === "" ? null : Number(raw);
				else if (type === "boolean") val = raw.toLowerCase() === "true"; // only "true" -> true
				else if (type === "date") val = raw ? new Date(raw).toISOString() : null;

				obj[h] = val;
			});


			return obj;
		});

		return data;
	}

	async function handleUpload() {
		if (!file) return;
		setStatus("uploading");
		setUploadProgress(0);
		setServerMessage("");

		try {
			const text = await file.text();
			const schema = {
				Amount: "number",
				Begin: "date",
				Until: "date",
				returned: "boolean",
				returnedAt: "date"
				};

				const jsonData = JSON.stringify(csvToJson(text, schema));

			// Upload to configured URL
			const targetUrl = uploadUrl;
			const response = await axios.post(targetUrl, jsonData, {
				headers: { "Content-Type": "application/json" },
				onUploadProgress: (event) => {
					const { loaded, total } = event;
					const percent = total ? Math.round((loaded * 100) / total) : 0;
					setUploadProgress(percent);
				},
			});

			setStatus("success");
			setUploadProgress(100);
			setServerMessage(`✅ Uploaded successfully: ${JSON.stringify(response.data)}`);
		} catch (error: any) {
			console.error("Upload error:", error);
			setStatus("error");
			setUploadProgress(0);
			if (axios.isAxiosError(error) && error.response) {
				setServerMessage(
					`❌ Server error ${error.response.status}: ${JSON.stringify(
						error.response.data
					)}`
				);
			} else {
				setServerMessage("❌ Upload failed. Check console for details.");
			}
		}
	}

	const inner = (
		<div className="">
			{/* Hidden native input - we use the Button to trigger it */}
			<input
				ref={inputRef}
				type="file"
				accept=".csv,text/csv"
				onChange={handleFileChange}
				className="hidden"
			/>

      


			<div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-3 sm:space-y-0">

				<a
					href={templateUrl}
					download
					className="inline-block"
					aria-label="Download CSV template"
				>
					<Button size="default" asChild>
						<span>Download template</span>
					</Button>
				</a>

				<Button
					onClick={() => inputRef.current?.click()}
					variant="outline"
					size="default"
				>
					Choose CSV
				</Button>

				

				<Button
					onClick={handleUpload}
					disabled={!file || status === "uploading"}
					variant="default"
					size="default"
				>
					Upload
				</Button>
			</div>

			{file && (
				<div className="text-sm text-muted-foreground mt-3">
					<p>
						<strong>Name:</strong> {file.name}
					</p>
					<p>
						<strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB
					</p>
				</div>
			)}

			{status === "uploading" && (
				<div className="space-y-2 mt-3">
					<div className="w-full h-2.5 rounded-full bg-muted">
						<div
							className="h-2.5 rounded-full bg-primary transition-all duration-300"
							style={{ width: `${uploadProgress}%` }}
						/>
					</div>
					<p className="text-sm text-muted-foreground">{uploadProgress}% uploaded</p>
				</div>
			)}

			{(status === "success" || status === "error") && (
				<div className="mt-4">
					{status === "success" && (
						<p className="text-sm text-green-600">{serverMessage}</p>
					)}
					{status === "error" && (
						<p className="text-sm text-red-600">{serverMessage}</p>
					)}
				</div>
			)}
		</div>
	)

	if (!wrapInCard) return inner

	return (
		<div className="max-w-xl mx-auto p-4">
			<Card>
				<CardHeader>
					<CardTitle>Upload</CardTitle>
				</CardHeader>

				<CardContent>{inner}</CardContent>
			</Card>
		</div>
	)
}