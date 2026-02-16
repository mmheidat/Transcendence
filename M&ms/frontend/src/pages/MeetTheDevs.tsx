import React from 'react';
import { useNavigate } from 'react-router-dom';
import dev1 from '../assets/developers/dev_new_1.jpg';
import dev2 from '../assets/developers/dev_new_2.jpg';
import dev3 from '../assets/developers/dev_new_3.jpg';
import dev4 from '../assets/developers/dev_new_4.png';
import dev5 from '../assets/developers/dev_new_5.jpg';

const MeetTheDevs: React.FC = () => {
    const navigate = useNavigate();
    const developers = [
        {
            id: 1,
            image: dev1,
            name: 'Mohammad Mheidat',
            role: 'Full Stack Developer', // Placeholder
            quote: '"Coding is poetry written in logic."' // Placeholder
        },
        {
            id: 2,
            image: dev2,
            name: 'Maeen Bamatraf',
            role: 'Frontend Specialist', // Placeholder
            quote: '"Design is intelligence made visible."' // Placeholder
        },
        {
            id: 3,
            image: dev3,
            name: 'Mohamed Alsherif',
            role: 'Backend Architect', // Placeholder
            quote: '"First, solve the problem. Then, write the code."' // Placeholder
        }
    ];

    const additionalDevs = [
        {
            id: 4,
            image: dev4,
            name: 'Reem Ali',
            role: 'Authentication & Security Engineer',
            quote: '"Security is not a product, but a process."'
        },
        {
            id: 5,
            image: dev5,
            name: 'Ruslan Nartdinov',
            role: 'Game Developer',
            quote: '"Every great game begins with a single line of code."'
        }
    ];

    const renderDevCard = (dev: { id: number; image: string; name: string; role: string; quote: string }) => (
        <div key={dev.id} className="group relative">
            {/* Glowing Background Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>

            <div className="relative h-full bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-colors duration-300 flex flex-col items-center text-center">
                <div className="relative w-full aspect-[3/4] mb-6 overflow-hidden rounded-xl">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10 opacity-60"></div>
                    <img
                        src={dev.image}
                        alt={dev.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">{dev.name}</h3>
                <p className="text-rose-400 font-medium mb-4">{dev.role}</p>
                <blockquote className="italic text-gray-400 text-sm">
                    {dev.quote}
                </blockquote>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600 mb-4 animate-pulse">
                        Meet the Architects
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        The minds behind the code using the power of anime and coffee.
                    </p>
                </div>

                {/* Top row - 3 developers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {developers.map(renderDevCard)}
                </div>

                {/* Bottom row - 2 additional developers, centered */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12 max-w-4xl mx-auto">
                    {additionalDevs.map(renderDevCard)}
                </div>

                <div className="text-center mt-16">
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-lg transition duration-300 shadow-lg hover:shadow-indigo-500/50"
                    >
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MeetTheDevs;
